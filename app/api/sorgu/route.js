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

    // TC ile sorgulama (Hangi veritabanına gideceğini TC'nin ilk 2 hanesine göre seç)
    if (tc) {
      const prefix = parseInt(tc.substring(0, 2), 10);
      let dbIndex = 1;
      
      if (prefix >= 34 && prefix <= 66) dbIndex = 2;
      else if (prefix >= 67 && prefix <= 99) dbIndex = 3;
      // 4. veritabanı (yedek veya özel aralık için kullanılabilir, şimdilik 1-3 arası dağıtıyoruz)

      const sql = "SELECT * FROM kisiler WHERE tc = $1 LIMIT 10";
      const res = await pools[dbIndex].query(sql, [tc]);
      results = res.rows;
    } 
    // Ad ve Soyad ile sorgulama (Tüm veritabanlarına aynı anda bak)
    else if (ad && soyad) {
      const sql = "SELECT * FROM kisiler WHERE ad ILIKE $1 AND soyad ILIKE $2 LIMIT 10";
      const args = [`%${ad}%`, `%${soyad}%`];

      const promises = Object.values(pools).map(pool => pool.query(sql, args));
      const dbResults = await Promise.all(promises);
      
      // Tüm sonuçları birleştir ve ilk 10'u al
      dbResults.forEach(res => { results = results.concat(res.rows); });
      results = results.slice(0, 10);
    }

    return NextResponse.json({ basarili: true, toplam_bulunan: results.length, veriler: results });

  } catch (error) {
    console.error("API Hatası:", error);
    return NextResponse.json({ hata: "Sunucu hatası", detay: error.message }, { status: 500 });
  }
                              }
