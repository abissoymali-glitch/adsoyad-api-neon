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

    // TC ile sorgulama (TÜM veritabanlarına aynı anda bak)
    if (tc) {
      const sql = "SELECT * FROM kisiler WHERE tc = $1 LIMIT 10";
      const args = [tc];

      // Tüm pool'lara istek at
      const promises = Object.values(pools).map(pool => pool.query(sql, args));
      
      try {
        const dbResults = await Promise.all(promises);
        // Gelen tüm sonuçları birleştir
        dbResults.forEach(res => { results = results.concat(res.rows); });
        results = results.slice(0, 10); // İlk 10 sonucu tut
      } catch (err) {
        console.error("TC sorgu hatası:", err);
        // Bir veritabanı hata verirse diğerlerini es geçme, hata mesajını dön
        return NextResponse.json({ hata: "Veritabanı bağlantı hatası", detay: err.message }, { status: 500 });
      }
    } 
    // Ad ve Soyad ile sorgulama (TÜM veritabanlarına aynı anda bak)
    else if (ad && soyad) {
      const sql = "SELECT * FROM kisiler WHERE ad ILIKE $1 AND soyad ILIKE $2 LIMIT 10";
      const args = [`%${ad}%`, `%${soyad}%`];

      const promises = Object.values(pools).map(pool => pool.query(sql, args));
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
