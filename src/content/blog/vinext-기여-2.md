---
title: "vinext 기여 2"
pubDate: 2026-05-30T00:00:00.000Z
notionId: "36c7cf19-a364-8029-b139-d46ad0b52463"
---
[https://github.com/cloudflare/vinext/pull/1590](https://github.com/cloudflare/vinext/pull/1590)


# **Vinext App Router static export에서 metadata asset 누락 문제 수정**


## **한 줄 요약**


Vinext의 App Router static export 과정에서 `apple-icon.png`, `icon.png`, `opengraph-image.png`, `twitter-image.png`, `sitemap.xml` 같은 file-based metadata asset이 export 결과물에 포함되지 않던 문제를 수정했다.


## **배경**


Next.js App Router에서는 라우트 세그먼트 안에 특별한 metadata 파일을 배치할 수 있다. 예를 들어 `opengraph-image.png`, `twitter-image.png`, `icon.png`, `sitemap.xml` 같은 파일을 `app` 디렉터리 안에 두면, Next.js가 이를 file-based metadata로 인식하고 적절한 metadata route 및 `<head>` 정보를 구성한다. Next.js 문서에서도 file-based metadata는 route segment에 특별한 파일을 추가하는 방식으로 정의할 수 있고, 정적 파일 또는 코드 기반 동적 생성 방식 모두를 지원한다고 설명한다.


문제는 Vinext의 `output: "export"` 모드에서 App Router를 static export할 때, HTML 파일은 생성되지만 file-based static metadata asset이 export 결과물에 복사되지 않는 경우가 있었다는 점이다. 특히 동적 세그먼트 아래에 있는 metadata 파일은 Next.js와 동일한 canonical placeholder 경로로 export되어야 했다.


예를 들어 다음과 같은 파일이 있을 때:


```plain text
app/metadata-dynamic-static/[slug]/icon.png
```


static export 결과물에서는 Next.js 동작과 맞춰 다음 경로로 제공되어야 한다.


```plain text
metadata-dynamic-static/-/icon.png
```


관련 upstream 이슈에서는 Next.js가 동적 세그먼트 아래의 static metadata 파일을 param별 동적 prerender로 취급하지 않고, `-` placeholder를 사용한 canonical pathname으로 한 번만 prerender하도록 정리한 배경을 설명하고 있다. 대상 파일 예시로는 `apple-icon.png`, `icon.png`, `opengraph-image.png`, `twitter-image.png`, `sitemap.xml` 등이 언급된다.


## **변경 내용**


이번 PR의 핵심은 App Router static export 과정에서 metadata route를 스캔하고, 정적 metadata 파일을 export output directory로 직접 복사하도록 만든 것이다. PR 설명에서도 “App Router static export 중 file-based static metadata asset을 복사한다”, “동적 세그먼트 아래의 static metadata 파일을 Next.js 호환 `-` placeholder 경로로 export한다”, “복사된 metadata asset을 `StaticExportResult.files`에 포함한다”는 내용이 요약되어 있다.


구현 관점에서는 `prerenderApp()` 쪽에 metadata export 처리가 추가되었다. `metadataOutputPath()`로 `servedUrl`에서 실제 output path를 만들고, `emitStaticMetadataFiles()`에서 metadata route들을 순회하면서 정적 metadata 파일을 `outDir` 아래로 복사한다. 이때 `route.isDynamic`인 항목은 건너뛰고, static metadata file만 복사한다. 복사된 파일 목록은 `outputFiles`로 모아 반환된다.


또한 `run-prerender.ts`에서는 App Router 단계에서 `scanMetadataFiles(appDir)`를 호출해 metadata route를 수집하고, 이를 `prerenderApp()`에 전달하도록 변경되었다. 이후 `prerenderApp()`에서 반환된 `outputFiles`를 전체 prerender 결과에 합산한다.


`static-export.ts`에서는 기존 `StaticExportResult.files`가 HTML 파일 중심으로 구성되던 흐름에 metadata asset 목록을 추가할 수 있도록 `toStaticExportResult()`가 확장되었다. 즉, route render 결과에서 나온 `.html` 파일뿐 아니라, 별도로 복사된 static metadata asset도 export 결과의 `files`에 포함된다.


## **동적 세그먼트 처리**


중요한 부분은 동적 세그먼트 아래의 metadata 파일 처리다.


예를 들어 다음과 같은 경로가 있다고 가정한다.


```plain text
app/metadata-dynamic-static/[slug]/apple-icon.png
```


이 파일은 특정 `slug` 값마다 내용이 달라지는 파일이 아니다. 동일한 static file이기 때문에 모든 param에 대해 반복해서 export할 필요가 없다. 대신 Next.js와 같은 방식으로 동적 세그먼트를 `-`로 치환한 canonical path에 한 번만 export한다.


```plain text
metadata-dynamic-static/-/apple-icon.png
```


테스트에서도 이 경로가 실제 파일로 존재하는지, `StaticExportResult.files`에 포함되는지, 그리고 정적 서버를 통해 HTTP로 접근했을 때 `200`과 `image/png` content-type을 반환하는지 확인한다.


## **리뷰 반영**


리뷰 과정에서는 두 가지 포인트가 나왔다.


첫 번째는 production code에서 실제로 사용되지 않는 helper에 대한 지적이었다. 리뷰에서는 `getStaticMetadataPrerenderPathname`와 `getStaticMetadataFileConfig`가 export되고 테스트까지 있지만, 실제 metadata export 경로에서는 `emitStaticMetadataFiles()`가 `route.servedUrl`을 직접 사용하므로 dead code가 될 수 있다고 지적했다. 최종 리뷰에서는 이 dead code concern이 해결되었고 해당 함수들이 제거되었다고 확인했다.


두 번째는 `metadataOutputPath()`의 방어적 검증에 대한 코멘트였다. `servedUrl`은 내부적으로 통제된 값이지만, `.` 또는 `..` 같은 traversal segment를 방어적으로 걸러내는 로직이 있었고, 리뷰에서는 이 검증이 defense-in-depth 성격이라는 주석을 남기는 것이 좋겠다고 제안했다. 이후 최종 리뷰에서 해당 주석도 반영된 것으로 확인된다.


## **테스트 보강**


테스트는 App Router static export 경로와 static metadata file serving 경로를 함께 보강했다.


`tests/app-router.test.ts`에서는 `staticExportApp()` 호출 시 `appDir`를 전달하고, export 결과의 `files`에 `metadata-dynamic-static/-/apple-icon.png`가 포함되는지 확인한다.


`tests/static-export.test.ts`에서는 실제 static server를 띄워 export 결과물을 HTTP로 서빙하는 방식의 테스트가 추가되었다. 특히 `metadata-dynamic-static/-/apple-icon.png` 파일이 존재하는지, export result에 포함되는지, 요청 시 `200` 응답과 `image/png` content-type을 반환하는지 검증한다.


사용자가 정리한 검증 커맨드는 다음과 같이 블로그에 적으면 좋다.


```bash
pnpm exec vp check packages/vinext/src/build/static-export.ts tests/app-router.test.ts tests/static-export.test.ts

pnpm exec vp test run tests/static-export.test.ts -t "static metadata"

pnpm exec vp test run tests/app-router.test.ts -t "App Router Static export"
```


## **정리**


이번 변경은 큰 기능 추가라기보다는 Next.js App Router의 static export 동작과 Vinext의 동작을 더 정확히 맞추는 호환성 수정에 가깝다.


핵심은 다음 세 가지다.

1. App Router static export 시 file-based static metadata asset도 export 결과물에 포함한다.
2. 동적 세그먼트 아래의 static metadata 파일은 Next.js와 동일하게  placeholder 경로로 export한다.
3. 복사된 metadata asset을 `StaticExportResult.files`에도 포함해, export 결과를 사용하는 쪽에서 누락 없이 추적할 수 있게 한다.

결과적으로 `output: "export"`를 사용하는 App Router 프로젝트에서도 `apple-icon.png`, `icon.png`, `opengraph-image.png`, `twitter-image.png`, `sitemap.xml` 같은 metadata 파일이 HTML과 함께 정상적으로 배포될 수 있게 되었다.
