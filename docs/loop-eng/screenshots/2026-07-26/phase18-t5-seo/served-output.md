# 실제 서버 응답 (next build && next start, 프로덕션 모드)

## GET /robots.txt  → HTTP 200
```
User-Agent: *
Allow: /welcome
Allow: /p/
Allow: /opengraph-image
Disallow: /

Sitemap: https://little-dev-duck.vercel.app/sitemap.xml
```

## GET /sitemap.xml  → HTTP 200
```
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
<url>
<loc>https://little-dev-duck.vercel.app/welcome</loc>
<changefreq>monthly</changefreq>
<priority>1</priority>
</url>
</urlset>
```

## 워크스페이스 경로가 크롤러에 열려 있지 않은지(robots 규칙 대조)
```
/pages → robots allow 목록에 없음(정상)
/settings → robots allow 목록에 없음(정상)
/insights → robots allow 목록에 없음(정상)
/news → robots allow 목록에 없음(정상)
/office → robots allow 목록에 없음(정상)
/admin → robots allow 목록에 없음(정상)
```
