/*
 * ATTENTION: An "eval-source-map" devtool has been used.
 * This devtool is neither made for production nor for readable output files.
 * It uses "eval()" calls to create a separate source file with attached SourceMaps in the browser devtools.
 * If you are trying to read the output file, select a different devtool (https://webpack.js.org/configuration/devtool/)
 * or disable the default devtool with "devtool: false".
 * If you are looking for production-ready output files, see mode: "production" (https://webpack.js.org/configuration/mode/).
 */
(() => {
var exports = {};
exports.id = "app/auth/callback/route";
exports.ids = ["app/auth/callback/route"];
exports.modules = {

/***/ "(rsc)/./app/auth/callback/route.ts":
/*!************************************!*\
  !*** ./app/auth/callback/route.ts ***!
  \************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   GET: () => (/* binding */ GET)\n/* harmony export */ });\n/* harmony import */ var next_server__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! next/server */ \"(rsc)/./node_modules/next/dist/api/server.js\");\n/* harmony import */ var _lib_supabaseServer__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! @/lib/supabaseServer */ \"(rsc)/./lib/supabaseServer.ts\");\n\n\n/**\n * Google OAuth / Magic Link 回調處理\n * Supabase 會把 code 帶到這個 URL，這裡負責交換成 session\n */ async function GET(request) {\n    const { searchParams, origin } = new URL(request.url);\n    const code = searchParams.get(\"code\");\n    const next = searchParams.get(\"next\") ?? \"/\";\n    if (code) {\n        const supabase = await (0,_lib_supabaseServer__WEBPACK_IMPORTED_MODULE_1__.createSupabaseServer)();\n        const { error } = await supabase.auth.exchangeCodeForSession(code);\n        if (!error) {\n            // 確保 next 是相對路徑，防止 open redirect\n            const safeNext = next.startsWith(\"/\") ? next : \"/\";\n            return next_server__WEBPACK_IMPORTED_MODULE_0__.NextResponse.redirect(`${origin}${safeNext}`);\n        }\n    }\n    // 發生錯誤時導向登入頁\n    return next_server__WEBPACK_IMPORTED_MODULE_0__.NextResponse.redirect(`${origin}/login?error=auth_callback_failed`);\n}\n//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiKHJzYykvLi9hcHAvYXV0aC9jYWxsYmFjay9yb3V0ZS50cyIsIm1hcHBpbmdzIjoiOzs7Ozs7QUFBd0Q7QUFDSTtBQUU1RDs7O0NBR0MsR0FDTSxlQUFlRSxJQUFJQyxPQUFvQjtJQUM1QyxNQUFNLEVBQUVDLFlBQVksRUFBRUMsTUFBTSxFQUFFLEdBQUcsSUFBSUMsSUFBSUgsUUFBUUksR0FBRztJQUVwRCxNQUFNQyxPQUFPSixhQUFhSyxHQUFHLENBQUM7SUFDOUIsTUFBTUMsT0FBT04sYUFBYUssR0FBRyxDQUFDLFdBQVc7SUFFekMsSUFBSUQsTUFBTTtRQUNSLE1BQU1HLFdBQVcsTUFBTVYseUVBQW9CQTtRQUMzQyxNQUFNLEVBQUVXLEtBQUssRUFBRSxHQUFHLE1BQU1ELFNBQVNFLElBQUksQ0FBQ0Msc0JBQXNCLENBQUNOO1FBQzdELElBQUksQ0FBQ0ksT0FBTztZQUNWLGlDQUFpQztZQUNqQyxNQUFNRyxXQUFXTCxLQUFLTSxVQUFVLENBQUMsT0FBT04sT0FBTztZQUMvQyxPQUFPVixxREFBWUEsQ0FBQ2lCLFFBQVEsQ0FBQyxHQUFHWixTQUFTVSxVQUFVO1FBQ3JEO0lBQ0Y7SUFFQSxhQUFhO0lBQ2IsT0FBT2YscURBQVlBLENBQUNpQixRQUFRLENBQUMsR0FBR1osT0FBTyxpQ0FBaUMsQ0FBQztBQUMzRSIsInNvdXJjZXMiOlsiRDpcXENsYXVkZVxcc3RvY2sgc3lzdGVtXFxhcHBcXGF1dGhcXGNhbGxiYWNrXFxyb3V0ZS50cyJdLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBOZXh0UmVxdWVzdCwgTmV4dFJlc3BvbnNlIH0gZnJvbSBcIm5leHQvc2VydmVyXCI7XG5pbXBvcnQgeyBjcmVhdGVTdXBhYmFzZVNlcnZlciB9IGZyb20gXCJAL2xpYi9zdXBhYmFzZVNlcnZlclwiO1xuXG4vKipcbiAqIEdvb2dsZSBPQXV0aCAvIE1hZ2ljIExpbmsg5Zue6Kq/6JmV55CGXG4gKiBTdXBhYmFzZSDmnIPmioogY29kZSDluLbliLDpgJnlgIsgVVJM77yM6YCZ6KOh6LKg6LKs5Lqk5o+b5oiQIHNlc3Npb25cbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIEdFVChyZXF1ZXN0OiBOZXh0UmVxdWVzdCkge1xuICBjb25zdCB7IHNlYXJjaFBhcmFtcywgb3JpZ2luIH0gPSBuZXcgVVJMKHJlcXVlc3QudXJsKTtcblxuICBjb25zdCBjb2RlID0gc2VhcmNoUGFyYW1zLmdldChcImNvZGVcIik7XG4gIGNvbnN0IG5leHQgPSBzZWFyY2hQYXJhbXMuZ2V0KFwibmV4dFwiKSA/PyBcIi9cIjtcblxuICBpZiAoY29kZSkge1xuICAgIGNvbnN0IHN1cGFiYXNlID0gYXdhaXQgY3JlYXRlU3VwYWJhc2VTZXJ2ZXIoKTtcbiAgICBjb25zdCB7IGVycm9yIH0gPSBhd2FpdCBzdXBhYmFzZS5hdXRoLmV4Y2hhbmdlQ29kZUZvclNlc3Npb24oY29kZSk7XG4gICAgaWYgKCFlcnJvcikge1xuICAgICAgLy8g56K65L+dIG5leHQg5piv55u45bCN6Lev5b6R77yM6Ziy5q2iIG9wZW4gcmVkaXJlY3RcbiAgICAgIGNvbnN0IHNhZmVOZXh0ID0gbmV4dC5zdGFydHNXaXRoKFwiL1wiKSA/IG5leHQgOiBcIi9cIjtcbiAgICAgIHJldHVybiBOZXh0UmVzcG9uc2UucmVkaXJlY3QoYCR7b3JpZ2lufSR7c2FmZU5leHR9YCk7XG4gICAgfVxuICB9XG5cbiAgLy8g55m855Sf6Yyv6Kqk5pmC5bCO5ZCR55m75YWl6aCBXG4gIHJldHVybiBOZXh0UmVzcG9uc2UucmVkaXJlY3QoYCR7b3JpZ2lufS9sb2dpbj9lcnJvcj1hdXRoX2NhbGxiYWNrX2ZhaWxlZGApO1xufVxuIl0sIm5hbWVzIjpbIk5leHRSZXNwb25zZSIsImNyZWF0ZVN1cGFiYXNlU2VydmVyIiwiR0VUIiwicmVxdWVzdCIsInNlYXJjaFBhcmFtcyIsIm9yaWdpbiIsIlVSTCIsInVybCIsImNvZGUiLCJnZXQiLCJuZXh0Iiwic3VwYWJhc2UiLCJlcnJvciIsImF1dGgiLCJleGNoYW5nZUNvZGVGb3JTZXNzaW9uIiwic2FmZU5leHQiLCJzdGFydHNXaXRoIiwicmVkaXJlY3QiXSwiaWdub3JlTGlzdCI6W10sInNvdXJjZVJvb3QiOiIifQ==\n//# sourceURL=webpack-internal:///(rsc)/./app/auth/callback/route.ts\n");

/***/ }),

/***/ "(rsc)/./lib/supabaseServer.ts":
/*!*******************************!*\
  !*** ./lib/supabaseServer.ts ***!
  \*******************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   createSupabaseServer: () => (/* binding */ createSupabaseServer)\n/* harmony export */ });\n/* harmony import */ var _supabase_ssr__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @supabase/ssr */ \"(rsc)/./node_modules/@supabase/ssr/dist/module/index.js\");\n/* harmony import */ var next_headers__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! next/headers */ \"(rsc)/./node_modules/next/dist/api/headers.js\");\n\n\n/**\n * 伺服器端 Supabase client（API Routes、Server Components 使用）\n *\n * 透過 Cookie 取得使用者 session，讓 RLS 正確套用。\n * 必須在 async 函式內呼叫（因為 cookies() 是 async）。\n */ async function createSupabaseServer() {\n    const cookieStore = await (0,next_headers__WEBPACK_IMPORTED_MODULE_1__.cookies)();\n    return (0,_supabase_ssr__WEBPACK_IMPORTED_MODULE_0__.createServerClient)(\"https://pqkxnfwdkdocjnolcpua.supabase.co\", \"sb_publishable_gDlbcCMgp2EeqLVW29PkBg_hWHKPxEd\", {\n        cookies: {\n            getAll () {\n                return cookieStore.getAll();\n            },\n            setAll (cookiesToSet) {\n                try {\n                    cookiesToSet.forEach(({ name, value, options })=>cookieStore.set(name, value, options));\n                } catch  {\n                // Server Component 無法設定 cookie，忽略即可\n                }\n            }\n        }\n    });\n}\n//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiKHJzYykvLi9saWIvc3VwYWJhc2VTZXJ2ZXIudHMiLCJtYXBwaW5ncyI6Ijs7Ozs7O0FBQTZFO0FBQ3RDO0FBR3ZDOzs7OztDQUtDLEdBQ00sZUFBZUU7SUFDcEIsTUFBTUMsY0FBYyxNQUFNRixxREFBT0E7SUFFakMsT0FBT0QsaUVBQWtCQSxDQUN2QkksMENBQW9DLEVBQ3BDQSxnREFBeUMsRUFDekM7UUFDRUgsU0FBUztZQUNQTztnQkFDRSxPQUFPTCxZQUFZSyxNQUFNO1lBQzNCO1lBQ0FDLFFBQU9DLFlBQXVGO2dCQUM1RixJQUFJO29CQUNGQSxhQUFhQyxPQUFPLENBQUMsQ0FBQyxFQUFFQyxJQUFJLEVBQUVDLEtBQUssRUFBRUMsT0FBTyxFQUFFLEdBQzVDWCxZQUFZWSxHQUFHLENBQUNILE1BQU1DLE9BQU9DO2dCQUVqQyxFQUFFLE9BQU07Z0JBQ04sb0NBQW9DO2dCQUN0QztZQUNGO1FBQ0Y7SUFDRjtBQUVKIiwic291cmNlcyI6WyJEOlxcQ2xhdWRlXFxzdG9jayBzeXN0ZW1cXGxpYlxcc3VwYWJhc2VTZXJ2ZXIudHMiXSwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgY3JlYXRlU2VydmVyQ2xpZW50LCB0eXBlIENvb2tpZU1ldGhvZHNTZXJ2ZXIgfSBmcm9tIFwiQHN1cGFiYXNlL3NzclwiO1xuaW1wb3J0IHsgY29va2llcyB9IGZyb20gXCJuZXh0L2hlYWRlcnNcIjtcbmltcG9ydCB0eXBlIHsgUmVzcG9uc2VDb29raWUgfSBmcm9tIFwibmV4dC9kaXN0L2NvbXBpbGVkL0BlZGdlLXJ1bnRpbWUvY29va2llc1wiO1xuXG4vKipcbiAqIOS8uuacjeWZqOerryBTdXBhYmFzZSBjbGllbnTvvIhBUEkgUm91dGVz44CBU2VydmVyIENvbXBvbmVudHMg5L2/55So77yJXG4gKlxuICog6YCP6YGOIENvb2tpZSDlj5blvpfkvb/nlKjogIUgc2Vzc2lvbu+8jOiukyBSTFMg5q2j56K65aWX55So44CCXG4gKiDlv4XpoIjlnKggYXN5bmMg5Ye95byP5YWn5ZG85Y+r77yI5Zug54K6IGNvb2tpZXMoKSDmmK8gYXN5bmPvvInjgIJcbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGNyZWF0ZVN1cGFiYXNlU2VydmVyKCkge1xuICBjb25zdCBjb29raWVTdG9yZSA9IGF3YWl0IGNvb2tpZXMoKTtcblxuICByZXR1cm4gY3JlYXRlU2VydmVyQ2xpZW50KFxuICAgIHByb2Nlc3MuZW52Lk5FWFRfUFVCTElDX1NVUEFCQVNFX1VSTCEsXG4gICAgcHJvY2Vzcy5lbnYuTkVYVF9QVUJMSUNfU1VQQUJBU0VfQU5PTl9LRVkhLFxuICAgIHtcbiAgICAgIGNvb2tpZXM6IHtcbiAgICAgICAgZ2V0QWxsKCkge1xuICAgICAgICAgIHJldHVybiBjb29raWVTdG9yZS5nZXRBbGwoKTtcbiAgICAgICAgfSxcbiAgICAgICAgc2V0QWxsKGNvb2tpZXNUb1NldDogQXJyYXk8eyBuYW1lOiBzdHJpbmc7IHZhbHVlOiBzdHJpbmc7IG9wdGlvbnM/OiBQYXJ0aWFsPFJlc3BvbnNlQ29va2llPiB9Pikge1xuICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICBjb29raWVzVG9TZXQuZm9yRWFjaCgoeyBuYW1lLCB2YWx1ZSwgb3B0aW9ucyB9KSA9PlxuICAgICAgICAgICAgICBjb29raWVTdG9yZS5zZXQobmFtZSwgdmFsdWUsIG9wdGlvbnMpXG4gICAgICAgICAgICApO1xuICAgICAgICAgIH0gY2F0Y2gge1xuICAgICAgICAgICAgLy8gU2VydmVyIENvbXBvbmVudCDnhKHms5XoqK3lrpogY29va2ll77yM5b+955Wl5Y2z5Y+vXG4gICAgICAgICAgfVxuICAgICAgICB9LFxuICAgICAgfSBzYXRpc2ZpZXMgQ29va2llTWV0aG9kc1NlcnZlcixcbiAgICB9XG4gICk7XG59XG4iXSwibmFtZXMiOlsiY3JlYXRlU2VydmVyQ2xpZW50IiwiY29va2llcyIsImNyZWF0ZVN1cGFiYXNlU2VydmVyIiwiY29va2llU3RvcmUiLCJwcm9jZXNzIiwiZW52IiwiTkVYVF9QVUJMSUNfU1VQQUJBU0VfVVJMIiwiTkVYVF9QVUJMSUNfU1VQQUJBU0VfQU5PTl9LRVkiLCJnZXRBbGwiLCJzZXRBbGwiLCJjb29raWVzVG9TZXQiLCJmb3JFYWNoIiwibmFtZSIsInZhbHVlIiwib3B0aW9ucyIsInNldCJdLCJpZ25vcmVMaXN0IjpbXSwic291cmNlUm9vdCI6IiJ9\n//# sourceURL=webpack-internal:///(rsc)/./lib/supabaseServer.ts\n");

/***/ }),

/***/ "(rsc)/./node_modules/next/dist/build/webpack/loaders/next-app-loader/index.js?name=app%2Fauth%2Fcallback%2Froute&page=%2Fauth%2Fcallback%2Froute&appPaths=&pagePath=private-next-app-dir%2Fauth%2Fcallback%2Froute.ts&appDir=D%3A%5CClaude%5Cstock%20system%5Capp&pageExtensions=tsx&pageExtensions=ts&pageExtensions=jsx&pageExtensions=js&rootDir=D%3A%5CClaude%5Cstock%20system&isDev=true&tsconfigPath=tsconfig.json&basePath=&assetPrefix=&nextConfigOutput=&preferredRegion=&middlewareConfig=e30%3D!":
/*!*************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************!*\
  !*** ./node_modules/next/dist/build/webpack/loaders/next-app-loader/index.js?name=app%2Fauth%2Fcallback%2Froute&page=%2Fauth%2Fcallback%2Froute&appPaths=&pagePath=private-next-app-dir%2Fauth%2Fcallback%2Froute.ts&appDir=D%3A%5CClaude%5Cstock%20system%5Capp&pageExtensions=tsx&pageExtensions=ts&pageExtensions=jsx&pageExtensions=js&rootDir=D%3A%5CClaude%5Cstock%20system&isDev=true&tsconfigPath=tsconfig.json&basePath=&assetPrefix=&nextConfigOutput=&preferredRegion=&middlewareConfig=e30%3D! ***!
  \*************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   patchFetch: () => (/* binding */ patchFetch),\n/* harmony export */   routeModule: () => (/* binding */ routeModule),\n/* harmony export */   serverHooks: () => (/* binding */ serverHooks),\n/* harmony export */   workAsyncStorage: () => (/* binding */ workAsyncStorage),\n/* harmony export */   workUnitAsyncStorage: () => (/* binding */ workUnitAsyncStorage)\n/* harmony export */ });\n/* harmony import */ var next_dist_server_route_modules_app_route_module_compiled__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! next/dist/server/route-modules/app-route/module.compiled */ \"(rsc)/./node_modules/next/dist/server/route-modules/app-route/module.compiled.js\");\n/* harmony import */ var next_dist_server_route_modules_app_route_module_compiled__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(next_dist_server_route_modules_app_route_module_compiled__WEBPACK_IMPORTED_MODULE_0__);\n/* harmony import */ var next_dist_server_route_kind__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! next/dist/server/route-kind */ \"(rsc)/./node_modules/next/dist/server/route-kind.js\");\n/* harmony import */ var next_dist_server_lib_patch_fetch__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! next/dist/server/lib/patch-fetch */ \"(rsc)/./node_modules/next/dist/server/lib/patch-fetch.js\");\n/* harmony import */ var next_dist_server_lib_patch_fetch__WEBPACK_IMPORTED_MODULE_2___default = /*#__PURE__*/__webpack_require__.n(next_dist_server_lib_patch_fetch__WEBPACK_IMPORTED_MODULE_2__);\n/* harmony import */ var D_Claude_stock_system_app_auth_callback_route_ts__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ./app/auth/callback/route.ts */ \"(rsc)/./app/auth/callback/route.ts\");\n\n\n\n\n// We inject the nextConfigOutput here so that we can use them in the route\n// module.\nconst nextConfigOutput = \"\"\nconst routeModule = new next_dist_server_route_modules_app_route_module_compiled__WEBPACK_IMPORTED_MODULE_0__.AppRouteRouteModule({\n    definition: {\n        kind: next_dist_server_route_kind__WEBPACK_IMPORTED_MODULE_1__.RouteKind.APP_ROUTE,\n        page: \"/auth/callback/route\",\n        pathname: \"/auth/callback\",\n        filename: \"route\",\n        bundlePath: \"app/auth/callback/route\"\n    },\n    resolvedPagePath: \"D:\\\\Claude\\\\stock system\\\\app\\\\auth\\\\callback\\\\route.ts\",\n    nextConfigOutput,\n    userland: D_Claude_stock_system_app_auth_callback_route_ts__WEBPACK_IMPORTED_MODULE_3__\n});\n// Pull out the exports that we need to expose from the module. This should\n// be eliminated when we've moved the other routes to the new format. These\n// are used to hook into the route.\nconst { workAsyncStorage, workUnitAsyncStorage, serverHooks } = routeModule;\nfunction patchFetch() {\n    return (0,next_dist_server_lib_patch_fetch__WEBPACK_IMPORTED_MODULE_2__.patchFetch)({\n        workAsyncStorage,\n        workUnitAsyncStorage\n    });\n}\n\n\n//# sourceMappingURL=app-route.js.map//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiKHJzYykvLi9ub2RlX21vZHVsZXMvbmV4dC9kaXN0L2J1aWxkL3dlYnBhY2svbG9hZGVycy9uZXh0LWFwcC1sb2FkZXIvaW5kZXguanM/bmFtZT1hcHAlMkZhdXRoJTJGY2FsbGJhY2slMkZyb3V0ZSZwYWdlPSUyRmF1dGglMkZjYWxsYmFjayUyRnJvdXRlJmFwcFBhdGhzPSZwYWdlUGF0aD1wcml2YXRlLW5leHQtYXBwLWRpciUyRmF1dGglMkZjYWxsYmFjayUyRnJvdXRlLnRzJmFwcERpcj1EJTNBJTVDQ2xhdWRlJTVDc3RvY2slMjBzeXN0ZW0lNUNhcHAmcGFnZUV4dGVuc2lvbnM9dHN4JnBhZ2VFeHRlbnNpb25zPXRzJnBhZ2VFeHRlbnNpb25zPWpzeCZwYWdlRXh0ZW5zaW9ucz1qcyZyb290RGlyPUQlM0ElNUNDbGF1ZGUlNUNzdG9jayUyMHN5c3RlbSZpc0Rldj10cnVlJnRzY29uZmlnUGF0aD10c2NvbmZpZy5qc29uJmJhc2VQYXRoPSZhc3NldFByZWZpeD0mbmV4dENvbmZpZ091dHB1dD0mcHJlZmVycmVkUmVnaW9uPSZtaWRkbGV3YXJlQ29uZmlnPWUzMCUzRCEiLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7QUFBK0Y7QUFDdkM7QUFDcUI7QUFDTztBQUNwRjtBQUNBO0FBQ0E7QUFDQSx3QkFBd0IseUdBQW1CO0FBQzNDO0FBQ0EsY0FBYyxrRUFBUztBQUN2QjtBQUNBO0FBQ0E7QUFDQTtBQUNBLEtBQUs7QUFDTDtBQUNBO0FBQ0EsWUFBWTtBQUNaLENBQUM7QUFDRDtBQUNBO0FBQ0E7QUFDQSxRQUFRLHNEQUFzRDtBQUM5RDtBQUNBLFdBQVcsNEVBQVc7QUFDdEI7QUFDQTtBQUNBLEtBQUs7QUFDTDtBQUMwRjs7QUFFMUYiLCJzb3VyY2VzIjpbIiJdLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBBcHBSb3V0ZVJvdXRlTW9kdWxlIH0gZnJvbSBcIm5leHQvZGlzdC9zZXJ2ZXIvcm91dGUtbW9kdWxlcy9hcHAtcm91dGUvbW9kdWxlLmNvbXBpbGVkXCI7XG5pbXBvcnQgeyBSb3V0ZUtpbmQgfSBmcm9tIFwibmV4dC9kaXN0L3NlcnZlci9yb3V0ZS1raW5kXCI7XG5pbXBvcnQgeyBwYXRjaEZldGNoIGFzIF9wYXRjaEZldGNoIH0gZnJvbSBcIm5leHQvZGlzdC9zZXJ2ZXIvbGliL3BhdGNoLWZldGNoXCI7XG5pbXBvcnQgKiBhcyB1c2VybGFuZCBmcm9tIFwiRDpcXFxcQ2xhdWRlXFxcXHN0b2NrIHN5c3RlbVxcXFxhcHBcXFxcYXV0aFxcXFxjYWxsYmFja1xcXFxyb3V0ZS50c1wiO1xuLy8gV2UgaW5qZWN0IHRoZSBuZXh0Q29uZmlnT3V0cHV0IGhlcmUgc28gdGhhdCB3ZSBjYW4gdXNlIHRoZW0gaW4gdGhlIHJvdXRlXG4vLyBtb2R1bGUuXG5jb25zdCBuZXh0Q29uZmlnT3V0cHV0ID0gXCJcIlxuY29uc3Qgcm91dGVNb2R1bGUgPSBuZXcgQXBwUm91dGVSb3V0ZU1vZHVsZSh7XG4gICAgZGVmaW5pdGlvbjoge1xuICAgICAgICBraW5kOiBSb3V0ZUtpbmQuQVBQX1JPVVRFLFxuICAgICAgICBwYWdlOiBcIi9hdXRoL2NhbGxiYWNrL3JvdXRlXCIsXG4gICAgICAgIHBhdGhuYW1lOiBcIi9hdXRoL2NhbGxiYWNrXCIsXG4gICAgICAgIGZpbGVuYW1lOiBcInJvdXRlXCIsXG4gICAgICAgIGJ1bmRsZVBhdGg6IFwiYXBwL2F1dGgvY2FsbGJhY2svcm91dGVcIlxuICAgIH0sXG4gICAgcmVzb2x2ZWRQYWdlUGF0aDogXCJEOlxcXFxDbGF1ZGVcXFxcc3RvY2sgc3lzdGVtXFxcXGFwcFxcXFxhdXRoXFxcXGNhbGxiYWNrXFxcXHJvdXRlLnRzXCIsXG4gICAgbmV4dENvbmZpZ091dHB1dCxcbiAgICB1c2VybGFuZFxufSk7XG4vLyBQdWxsIG91dCB0aGUgZXhwb3J0cyB0aGF0IHdlIG5lZWQgdG8gZXhwb3NlIGZyb20gdGhlIG1vZHVsZS4gVGhpcyBzaG91bGRcbi8vIGJlIGVsaW1pbmF0ZWQgd2hlbiB3ZSd2ZSBtb3ZlZCB0aGUgb3RoZXIgcm91dGVzIHRvIHRoZSBuZXcgZm9ybWF0LiBUaGVzZVxuLy8gYXJlIHVzZWQgdG8gaG9vayBpbnRvIHRoZSByb3V0ZS5cbmNvbnN0IHsgd29ya0FzeW5jU3RvcmFnZSwgd29ya1VuaXRBc3luY1N0b3JhZ2UsIHNlcnZlckhvb2tzIH0gPSByb3V0ZU1vZHVsZTtcbmZ1bmN0aW9uIHBhdGNoRmV0Y2goKSB7XG4gICAgcmV0dXJuIF9wYXRjaEZldGNoKHtcbiAgICAgICAgd29ya0FzeW5jU3RvcmFnZSxcbiAgICAgICAgd29ya1VuaXRBc3luY1N0b3JhZ2VcbiAgICB9KTtcbn1cbmV4cG9ydCB7IHJvdXRlTW9kdWxlLCB3b3JrQXN5bmNTdG9yYWdlLCB3b3JrVW5pdEFzeW5jU3RvcmFnZSwgc2VydmVySG9va3MsIHBhdGNoRmV0Y2gsICB9O1xuXG4vLyMgc291cmNlTWFwcGluZ1VSTD1hcHAtcm91dGUuanMubWFwIl0sIm5hbWVzIjpbXSwiaWdub3JlTGlzdCI6W10sInNvdXJjZVJvb3QiOiIifQ==\n//# sourceURL=webpack-internal:///(rsc)/./node_modules/next/dist/build/webpack/loaders/next-app-loader/index.js?name=app%2Fauth%2Fcallback%2Froute&page=%2Fauth%2Fcallback%2Froute&appPaths=&pagePath=private-next-app-dir%2Fauth%2Fcallback%2Froute.ts&appDir=D%3A%5CClaude%5Cstock%20system%5Capp&pageExtensions=tsx&pageExtensions=ts&pageExtensions=jsx&pageExtensions=js&rootDir=D%3A%5CClaude%5Cstock%20system&isDev=true&tsconfigPath=tsconfig.json&basePath=&assetPrefix=&nextConfigOutput=&preferredRegion=&middlewareConfig=e30%3D!\n");

/***/ }),

/***/ "(rsc)/./node_modules/next/dist/build/webpack/loaders/next-flight-client-entry-loader.js?server=true!":
/*!******************************************************************************************************!*\
  !*** ./node_modules/next/dist/build/webpack/loaders/next-flight-client-entry-loader.js?server=true! ***!
  \******************************************************************************************************/
/***/ (() => {



/***/ }),

/***/ "(ssr)/./node_modules/next/dist/build/webpack/loaders/next-flight-client-entry-loader.js?server=true!":
/*!******************************************************************************************************!*\
  !*** ./node_modules/next/dist/build/webpack/loaders/next-flight-client-entry-loader.js?server=true! ***!
  \******************************************************************************************************/
/***/ (() => {



/***/ }),

/***/ "../app-render/after-task-async-storage.external":
/*!***********************************************************************************!*\
  !*** external "next/dist/server/app-render/after-task-async-storage.external.js" ***!
  \***********************************************************************************/
/***/ ((module) => {

"use strict";
module.exports = require("next/dist/server/app-render/after-task-async-storage.external.js");

/***/ }),

/***/ "../app-render/work-async-storage.external":
/*!*****************************************************************************!*\
  !*** external "next/dist/server/app-render/work-async-storage.external.js" ***!
  \*****************************************************************************/
/***/ ((module) => {

"use strict";
module.exports = require("next/dist/server/app-render/work-async-storage.external.js");

/***/ }),

/***/ "./work-unit-async-storage.external":
/*!**********************************************************************************!*\
  !*** external "next/dist/server/app-render/work-unit-async-storage.external.js" ***!
  \**********************************************************************************/
/***/ ((module) => {

"use strict";
module.exports = require("next/dist/server/app-render/work-unit-async-storage.external.js");

/***/ }),

/***/ "next/dist/compiled/next-server/app-page.runtime.dev.js":
/*!*************************************************************************!*\
  !*** external "next/dist/compiled/next-server/app-page.runtime.dev.js" ***!
  \*************************************************************************/
/***/ ((module) => {

"use strict";
module.exports = require("next/dist/compiled/next-server/app-page.runtime.dev.js");

/***/ }),

/***/ "next/dist/compiled/next-server/app-route.runtime.dev.js":
/*!**************************************************************************!*\
  !*** external "next/dist/compiled/next-server/app-route.runtime.dev.js" ***!
  \**************************************************************************/
/***/ ((module) => {

"use strict";
module.exports = require("next/dist/compiled/next-server/app-route.runtime.dev.js");

/***/ })

};
;

// load runtime
var __webpack_require__ = require("../../../webpack-runtime.js");
__webpack_require__.C(exports);
var __webpack_exec__ = (moduleId) => (__webpack_require__(__webpack_require__.s = moduleId))
var __webpack_exports__ = __webpack_require__.X(0, ["vendor-chunks/next","vendor-chunks/@supabase","vendor-chunks/tslib","vendor-chunks/iceberg-js","vendor-chunks/cookie"], () => (__webpack_exec__("(rsc)/./node_modules/next/dist/build/webpack/loaders/next-app-loader/index.js?name=app%2Fauth%2Fcallback%2Froute&page=%2Fauth%2Fcallback%2Froute&appPaths=&pagePath=private-next-app-dir%2Fauth%2Fcallback%2Froute.ts&appDir=D%3A%5CClaude%5Cstock%20system%5Capp&pageExtensions=tsx&pageExtensions=ts&pageExtensions=jsx&pageExtensions=js&rootDir=D%3A%5CClaude%5Cstock%20system&isDev=true&tsconfigPath=tsconfig.json&basePath=&assetPrefix=&nextConfigOutput=&preferredRegion=&middlewareConfig=e30%3D!")));
module.exports = __webpack_exports__;

})();