import { NextResponse } from "next/server";
import { Pool } from "pg";

// 4 Neon veritabanı bağlantı havuzu
const pools = {
  1: new Pool({ connectionString: process.env.DATABASE_URL_1, ssl: { rejectUnauthorized: false } }),
  2: new Pool({ connectionString: process.env.DATABASE_URL_2, ssl: { rejectUnauthorized: false } }),
  3: new Pool({ connectionString: process.env.DATABASE_URL_3, ssl: { rejectUnauthorized: false } }),
  4: new Pool({ connectionString: process.env.DATABASE_URL_4, ssl: { rejectUnauthorized: false } })
};

export async function POST(req) {
  try {
    const body = await req.json();
    const { ad, soyad, tc } = body;

    if (!tc && (!ad || !soyad)) {
      return NextResponse.json({ hata: "Lütfen TC veya Ad Soyad girin." }, { status: 400 });
    }

    let results = [];

    // TC ile sorgulama
    if (tc) {
      const sql = "SELECT * FROM kisiler WHERE tc::text = $1::text LIMIT 10";
      const args = [tc];

      // Her veritabanına ayrı ayrı istek at, hata vereni yoksay
      const promises = Object.values(pools).map(pool => 
        pool.query(sql, args).catch(err => {
          console.error("Bir veritabanında TC sorgu hatası:", err.message);
          return { rows: [] }; // Hata verirse boş sonuç döndür
        })
      );
      
      const dbResults = await Promise.all(promises);
      dbResults.forEach(res => { results = results.concat(res.rows); });
      results = results.slice(0, 10);
    } 
    // Ad ve Soyad ile sorgulama
    else if (ad && soyad) {
      const sql = "SELECT * FROM kisiler WHERE ad ILIKE $1 AND soyad ILIKE $2 LIMIT 10";
      const args = [`%${ad}%`, `%${soyad}%`];

      const promises = Object.values(pools).map(pool => 
        pool.query(sql, args).catch(err => {
          console.error("Bir veritabanında Ad Soyad sorgu hatası:", err.message);
          return { rows: [] };
        })
      );
      
      const dbResults = await Promise.all(promises);
      dbResults.forEach(res => { results = results.concat(res.rows); });
      results = results.slice(0, 10);
    }

    return NextResponse.json({ basarili: true, toplam_bulunan: results.length, veriler: results });

  } catch (error) {
    console.error("API Hatası:", error);
    return NextResponse.json({ hata: "Sunucu hatası", detay: error.message }, { status: 500 });
  }
}
