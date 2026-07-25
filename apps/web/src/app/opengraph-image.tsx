import { ImageResponse } from "next/og";

// 공유 링크(카톡·슬랙·X)에서 카드로 보이게 하는 기본 OG 이미지. 루트에 두어 모든 라우트가 물려받는다
// (/welcome, /p/[slug] 포함). 페이지별 제목은 og:title 텍스트로 전달되고, 카드 이미지는 브랜드 인식용.
//
// 2026-07-25 : 공개공유 - OG이미지 - 폰트제약
// 이미지 안 문구를 라틴 문자로만 둔 이유: satori(next/og)는 한글 글리프를 그리려면 한글 폰트 버퍼가
// 필요하고, 이 저장소에는 한글 폰트가 없다(Geist=라틴 전용). 폰트 없이 한글을 넣으면 두부(□)로 깨진다.
// 한글 제목은 og:title 메타 텍스트로 플랫폼이 자체 폰트로 렌더하므로 카드에서 정상 노출된다.

export const alt = "Little Dev Duck";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#0c0a09",
          backgroundImage:
            "linear-gradient(135deg, #1c1917 0%, #0c0a09 55%, #171310 100%)",
        }}
      >
        {/* 절차적 오리 — 외부 에셋 없이 div로 그린다(파일 추적·경로 문제 회피) */}
        <div
          style={{
            position: "relative",
            display: "flex",
            width: 300,
            height: 210,
          }}
        >
          <div
            style={{
              position: "absolute",
              left: 60,
              top: 60,
              width: 220,
              height: 150,
              borderRadius: 999,
              backgroundColor: "#eab308",
            }}
          />
          <div
            style={{
              position: "absolute",
              left: 8,
              top: 0,
              width: 132,
              height: 132,
              borderRadius: 999,
              backgroundColor: "#facc15",
            }}
          />
          <div
            style={{
              position: "absolute",
              left: 0,
              top: 62,
              width: 52,
              height: 30,
              borderRadius: 8,
              backgroundColor: "#f97316",
            }}
          />
          <div
            style={{
              position: "absolute",
              left: 66,
              top: 44,
              width: 18,
              height: 18,
              borderRadius: 999,
              backgroundColor: "#0c0a09",
            }}
          />
        </div>

        <div
          style={{
            marginTop: 44,
            fontSize: 72,
            fontWeight: 700,
            letterSpacing: -2,
            color: "#fafaf9",
          }}
        >
          Little Dev Duck
        </div>

        <div
          style={{
            marginTop: 16,
            display: "flex",
            alignItems: "center",
          }}
        >
          <div
            style={{
              width: 40,
              height: 4,
              borderRadius: 999,
              backgroundColor: "#eab308",
            }}
          />
          <div
            style={{
              marginLeft: 16,
              fontSize: 30,
              color: "#a8a29e",
            }}
          >
            Shared page
          </div>
        </div>
      </div>
    ),
    size,
  );
}
