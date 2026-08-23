/**
 * Shared inline SVG icons for CAD toolbar and menu buttons.
 *
 * Consumed by cad-simple-ui-plugin, cad-html-plugin, cad-diff-viewer, and
 * cad-viewer. Import from `@mlightcad/cad-simple-viewer/icons` so HTML
 * viewer bundles do not pull in the full viewer. Each `ICON_*` constant is
 * an SVG snippet using `currentColor` for theming.
 */

/**
 * Builds an Element Plus icon SVG so review toolbar buttons match cad-viewer.
 *
 * @param pathDs - Path `d` attributes from `@element-plus/icons-vue`.
 */
function elementPlusIcon(...pathDs: string[]): string {
  const paths = pathDs
    .map(d => `<path fill="currentColor" d="${d}"/>`)
    .join('')
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 1024 1024">${paths}</svg>`
}

/** Select tool icon. */
export const ICON_SELECT =
  '<svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 20 20"><path fill="currentColor" d="M10.4379 15.2979h.002l4.86-4.86-9.722-4.86 4.86 9.72Zm7.562-5.298-3.434 3.434 3.2 3.2-1.132 1.132-3.2-3.2-3.434 3.434-7.6-15.6 15.6 7.6Z"/></svg>'

/** Pan tool icon. */
export const ICON_PAN =
  '<svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 20 20"><path fill="currentColor" d="M15.08 12.8537l.002-.002V5.5897c0-.422-.652-.414-.652 0v3.466c0 .938-1.482.95-1.482 0v-4.83c0-.414-.6381-.414-.6381 0h-.014v4.83c.014.95-1.482.95-1.482 0V3.4437c0-.42-.638-.414-.638 0v5.612c0 .95-1.494.95-1.494 0V4.2317c0-.408-.64-.42-.64 0v6.756c0 .802-1.094 1.088-1.494.388-.26-.446-.518-.892-.776-1.338-.338-.482-1.1-.15-.794.38.326.566.652 1.132.978 1.698.006.012.014.026.02.04.552.946 1.106 1.89 1.658 2.834.19.3.422.578.666.802h-.006c.672.61 1.528.964 2.418 1.052.888.06 1.7921-.124 2.5601-.612.3-.19.572-.416.816-.68.326-.368.57-.776.734-1.204.176-.482.258-.97.258-1.494Zm-.91-8.608-.004-.002c.958-.38 2.058.244 2.058 1.346v7.266c0 .652-.108 1.29-.332 1.894-.216.564-.53 1.114-.964 1.576-.318.34-.666.632-1.046.884-.978.612-2.1461.862-3.2601.774-1.128-.102-2.228-.564-3.098-1.352-.326-.292-.612-.646-.87-1.034-.558-.96-1.114-1.92-1.672-2.88l-.012-.028c-.326-.568-.652-1.138-.978-1.706-.59-1.018.068-2.186 1.156-2.336.536-.074 1.126.116 1.562.72.026.028.04.062.054.096.04.074.082.146.122.218V4.2337c0-1.176 1.244-1.788 2.202-1.278.42-1.278 2.378-1.264 2.792-.014.9721-.51 2.2221.102 2.2221 1.284v.06c.022-.014.046-.026.068-.04Z"/></svg>'

/** Zoom extents icon. */
export const ICON_ZOOM_EXTENT =
  '<svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 20 20"><path fill="currentColor" d="M9.3333 14.125 5.875 10.6667V14.125H9.3333Zm4.7917-3.4583-3.4583 3.4583H14.125V10.6667ZM10.6667 5.875 14.125 9.3333V5.875H10.6667ZM5.875 9.3333 9.3333 5.875H5.875V9.3333Zm9.2083 5.475c1.2333-1.3 1.9083-3.0333 1.9083-4.825-.0083-3.325-2.35-6.1833-5.6083-6.8417C8.125 2.4833 4.85 4.2 3.55 7.2583c-1.3 3.0583-.275 6.6083 2.4583 8.5 2.725 1.8917 6.4167 1.6 8.8167-.6917.0917-.0833.175-.175.2583-.2583Zm1.2583.5917 2.575 2.575c-.3167.3167-.625.625-.9417.9417-.8583-.8583-1.7167-1.7167-2.575-2.575-3.4083 2.9-8.4917 2.5917-11.525-.6917S.9417 7.275 4.1083 4.1083C7.2667.9417 12.3667.8417 15.65 3.875s3.5917 8.1167.6917 11.525Z"/></svg>'

/** Zoom window icon. */
export const ICON_ZOOM_WINDOW =
  '<svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 20 20"><path fill="currentColor" d="M15.0833 14.8083c1.2333-1.3 1.9083-3.0333 1.9083-4.825-.0083-3.325-2.35-6.1833-5.6083-6.8417C8.125 2.4833 4.85 4.2 3.55 7.2583c-1.3 3.0583-.275 6.6083 2.4583 8.5 2.725 1.8917 6.4167 1.6 8.8167-.6917.0917-.0833.175-.175.2583-.2583Zm1.2583.5917 2.575 2.575c-.3167.3167-.625.625-.9417.9417-.8583-.8583-1.7167-1.7167-2.575-2.575-3.4083 2.9-8.4917 2.5917-11.525-.6917C.8417 12.3667.9417 7.275 4.1083 4.1083 7.2667.9417 12.3667.8417 15.65 3.875s3.5917 8.1167.6917 11.525Zm-3.55-2.6083V7.2083H7.2083v5.5833h5.5833ZM5.875 5.875h8.25v8.25H5.875V5.875Z"/></svg>'

/** Layer manager icon. */
export const ICON_LAYER =
  '<svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 512 512"><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="32" d="m434.8 137.65l-149.36-68.1c-16.19-7.4-42.69-7.4-58.88 0L77.3 137.65c-17.6 8-17.6 21.09 0 29.09l148 67.5c16.89 7.7 44.69 7.7 61.58 0l148-67.5c17.52-8 17.52-21.1-.08-29.09M160 308.52l-82.7 37.11c-17.6 8-17.6 21.1 0 29.1l148 67.5c16.89 7.69 44.69 7.69 61.58 0l148-67.5c17.6-8 17.6-21.1 0-29.1l-79.94-38.47"/><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="32" d="m160 204.48l-82.8 37.16c-17.6 8-17.6 21.1 0 29.1l148 67.49c16.89 7.7 44.69 7.7 61.58 0l148-67.49c17.7-8 17.7-21.1.1-29.1L352 204.48"/></svg>'

/** Drawing layout switcher icon (staggered bento-box panels). */
export const ICON_LAYOUT =
  '<svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 20 20"><rect x="2" y="2" width="8.2" height="5" rx="1.2" fill="currentColor"/><rect x="2" y="8.5" width="8.2" height="9.5" rx="1.2" fill="currentColor"/><rect x="11.7" y="2" width="6.3" height="10" rx="1.2" fill="currentColor"/><rect x="11.7" y="13.5" width="6.3" height="4.5" rx="1.2" fill="currentColor"/></svg>'

/** Measure tools parent menu icon. */
export const ICON_MEASURE =
  '<svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 20 20"><path fill="currentColor" fill-rule="evenodd" d="M1.5 7h17v6h-17ZM4.25 7h1v2.5h-1ZM7.5 7h.75v1.5H7.5ZM10.25 7h1v2.5h-1ZM13.5 7h.75v1.5H13.5ZM16.25 7h1v2.5h-1Z"/></svg>'

/** Measure distance icon. */
export const ICON_MEASURE_DISTANCE =
  '<svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 20 20"><path fill="currentColor" d="M3.75 9.25h12.5v1.5H3.75v-1.5ZM2.25 6.5h1.5v7h-1.5v-7ZM16.25 6.5h1.5v7h-1.5v-7Z"/></svg>'

/** Measure angle icon. */
export const ICON_MEASURE_ANGLE =
  '<svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 20 20"><polygon fill="currentColor" points="5.74 7.13 7 9.5 4.15 7.72 3.2 7.12 3 7 7 4.5 6.17 6.05 5.67 7 5.74 7.13"/><polygon fill="currentColor" points="16 12.5 13.5 16.5 12.66 15.15 11.92 13.97 11 12.5 12 13.03 12.98 13.55 13.5 13.83 16 12.5"/><rect fill="currentColor" x="2" y="2.5" width="1" height="15"/><rect fill="currentColor" x="3" y="16.5" width="15" height="1"/><path fill="currentColor" d="M14,13c0,.18,0,.37,0,.55v0a6.82,6.82,0,0,1-.32,1.57l-.74-1.18L13,13.5c0-.14,0-.31,0-.47v0a6,6,0,0,0-6-6,6.74,6.74,0,0,0-1.26.13l-.29.07a5.61,5.61,0,0,0-1.3.52l-1-.6a7.07,7.07,0,0,1,2-.88,6.78,6.78,0,0,1,1-.19A7.7,7.7,0,0,1,7,6a7,7,0,0,1,7,7Z"/></svg>'

/** Measure area icon. */
export const ICON_MEASURE_AREA =
  '<svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 20 20"><path fill="currentColor" fill-rule="evenodd" d="M4 4h12v12H4V4Zm1.5 1.5v9h9v-9h-9Z"/><circle fill="currentColor" cx="4" cy="4" r="1.5"/><circle fill="currentColor" cx="16" cy="4" r="1.5"/><circle fill="currentColor" cx="4" cy="16" r="1.5"/><circle fill="currentColor" cx="16" cy="16" r="1.5"/></svg>'

/** Measure arc length icon. */
export const ICON_MEASURE_ARC =
  '<svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 20 20"><path fill="currentColor" d="M2 16A10 10 0 0 0 18 16h-1.5A8.5 8.5 0 0 1 3.5 16H2Z"/><circle fill="currentColor" cx="2" cy="16" r="1.5"/><circle fill="currentColor" cx="10" cy="12.2" r="1.5"/><circle fill="currentColor" cx="18" cy="16" r="1.5"/></svg>'

/** Measure point / coordinates icon. */
export const ICON_MEASURE_POINT =
  '<svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 20 20"><path fill="currentColor" d="M9.25 2h1.5v5.25H16v1.5h-5.25V16h-1.5v-7.25H4v-1.5h5.25V2Z"/><circle fill="currentColor" cx="10" cy="10" r="1.75"/></svg>'

/**
 * Clear / sweep icon (Noun Project "clear" 5576267 by Alzam).
 * https://thenounproject.com/icon/clear-5576267/
 */
export const ICON_CLEAR =
  '<svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 512 512" fill="currentColor" aria-hidden="true"><path d="M 459.5 0 L 475.5 0 L 476.5 1 L 479.5 1 L 485.5 3 Q 487.8 6.2 492.5 7 L 501 14.5 L 505 19.5 L 511 32.5 Q 510.2 35.8 512 36.5 L 512 52.5 L 511 53.5 L 511 56.5 L 509 62.5 L 506 68.5 L 493 89.5 L 483 108.5 L 478 115.5 L 472 127.5 L 467 134.5 L 457 153.5 L 452 160.5 L 442 179.5 L 437 186.5 L 431 198.5 L 440 213.5 L 440 215.5 L 443 220.5 L 447 232.5 L 448 240.5 L 449 241.5 L 449 245.5 L 450 246.5 L 450 254.5 L 451 255.5 L 451 274.5 L 450 275.5 L 450 283.5 L 449 284.5 L 449 289.5 L 448 290.5 L 448 294.5 L 447 295.5 L 446 302.5 L 442 314.5 L 438 322.5 L 438 324.5 L 428 345.5 L 428 347.5 L 425 352.5 L 422 361.5 L 418 368.5 L 418 370.5 L 415 375.5 L 412 384.5 L 408 391.5 L 408 393.5 L 405 398.5 L 402 407.5 L 398 414.5 L 395 423.5 L 391 430.5 L 391 432.5 L 381 453.5 L 381 455.5 L 378 460.5 L 375 469.5 L 371 476.5 L 368 485.5 L 361.5 497 L 353.5 501 L 348.5 501 L 347.5 500 L 344.5 500 L 329.5 495 L 326.5 493 L 321.5 492 L 318.5 490 L 303.5 485 L 289.5 478 L 287.5 478 L 282 473.5 L 279 467.5 L 279 459.5 L 280 458.5 L 280 455.5 L 281 454.5 L 281 451.5 L 282 450.5 L 283 442.5 L 284 441.5 L 286 431.5 L 285.5 431 L 281.5 435 L 259.5 455 L 255.5 457 L 246.5 457 L 223.5 444 L 189.5 421 L 155.5 394 L 133 373.5 L 130 367.5 L 130 359.5 L 134 352.5 L 223 233.5 L 242 206.5 L 254.5 192 L 271.5 177 L 285.5 168 L 299.5 161 L 314.5 156 L 317.5 156 L 318.5 155 L 330.5 154 L 331.5 153 L 352.5 153 L 354 151.5 L 356 146.5 L 372 120.5 L 374 115.5 L 387 94.5 L 397 75.5 L 402 68.5 L 408 56.5 L 413 49.5 L 423 30.5 L 431 17.5 L 439.5 9 L 449.5 3 L 455.5 1 L 458.5 1 L 459.5 0 Z M 466 30 L 459 33 L 454 39 L 448 51 L 443 58 L 433 77 L 428 84 L 414 110 L 409 117 L 407 122 L 405 124 L 403 129 L 401 131 L 399 136 L 384 161 L 386 162 L 388 162 L 396 166 L 409 175 L 422 153 L 424 148 L 429 141 L 431 136 L 433 134 L 435 129 L 437 127 L 439 122 L 444 115 L 454 96 L 459 89 L 469 70 L 474 63 L 482 47 L 482 43 L 480 38 L 475 32 L 469 30 L 466 30 Z M 333 183 L 332 184 L 328 184 L 327 185 L 324 185 L 323 186 L 320 186 L 314 188 L 300 195 L 286 205 L 271 220 L 267 225 L 266 228 L 410 310 L 412 307 L 412 305 L 416 296 L 418 285 L 419 284 L 419 279 L 420 278 L 420 252 L 419 251 L 419 246 L 417 241 L 417 238 L 411 224 L 402 211 L 389 198 L 371 188 L 362 185 L 352 184 L 351 183 L 333 183 Z M 248 252 L 195 322 L 193 326 L 172 353 L 167 361 L 194 384 L 228 409 L 249 422 L 256 417 L 303 372 L 310 368 L 318 368 L 322 370 L 328 378 Q 327 381 329 382 L 329 386 L 326 395 L 326 399 L 323 408 L 323 411 L 322 412 L 322 416 L 319 425 L 319 428 L 318 429 L 318 432 L 317 433 L 317 437 L 314 446 L 314 449 L 313 450 L 313 453 L 312 454 L 316 456 L 318 456 L 331 462 L 343 466 L 351 448 L 351 446 L 354 441 L 354 439 L 357 434 L 357 432 L 364 418 L 364 416 L 367 411 L 367 409 L 370 404 L 370 402 L 377 388 L 377 386 L 380 381 L 380 379 L 383 374 L 383 372 L 387 365 L 390 356 L 393 351 L 393 349 L 396 344 L 397 339 L 375 326 L 373 324 L 368 322 L 366 320 L 361 318 L 354 313 L 349 311 L 347 309 L 342 307 L 340 305 L 335 303 L 321 294 L 316 292 L 314 290 L 309 288 L 307 286 L 302 284 L 295 279 L 276 269 L 248 252 Z "/><path d="M 170.5 100 L 179.5 100 Q 185 102 188 106.5 L 190 110.5 L 190 134.5 L 184.5 142 L 177.5 145 L 171.5 145 L 166.5 143 L 162 138.5 L 159 129.5 L 159 115.5 L 160 114.5 Q 159.2 109.7 161 107.5 L 166.5 102 L 170.5 100 Z "/><path d="M 131.5 140 L 151.5 140 L 156.5 142 L 162 147.5 L 164 151.5 L 164 159.5 L 163 162.5 L 158.5 168 L 152.5 171 L 130.5 171 L 124.5 168 L 122 165.5 L 119 159.5 L 119 151.5 Q 121.3 145.3 126.5 142 L 131.5 140 Z "/><path d="M 197.5 140 L 218.5 140 L 223.5 142 L 228 146.5 L 231 152.5 L 231 158.5 L 229 163.5 L 223.5 169 L 218.5 171 L 197.5 171 L 192.5 169 L 188 164.5 L 186 160.5 L 185 153.5 L 188 146.5 L 191.5 143 L 197.5 140 Z "/><path d="M 171.5 166 L 177.5 166 L 180.5 167 L 187 171.5 L 190 176.5 L 190 200.5 Q 188 206 183.5 209 L 179.5 211 L 173.5 212 L 167.5 210 L 161 203.5 Q 159.2 201.3 160 196.5 L 159 195.5 L 159 181.5 L 162 172.5 L 165.5 169 L 171.5 166 Z "/><path d="M 50.5 223 L 60.5 223 L 68 228.5 L 71 234.5 L 71 256.5 Q 69.1 262.6 64.5 266 L 59.5 268 L 51.5 268 Q 45.3 265.7 42 260.5 L 40 255.5 L 40 235.5 L 42 230.5 L 48.5 224 L 50.5 223 Z "/><path d="M 13.5 263 L 30.5 263 Q 31.5 265 35.5 264 L 43 270.5 L 45 274.5 L 45 282.5 Q 43.1 288.6 38.5 292 L 33.5 294 L 10.5 294 Q 5 292 2 287.5 L 0 283.5 L 0 274.5 Q 2.3 268.3 7.5 265 L 13.5 263 Z "/><path d="M 80.5 263 L 97.5 263 L 103.5 265 L 108 268.5 L 111 273.5 L 112 279.5 L 109 287.5 L 104.5 292 L 100.5 294 L 77.5 294 Q 71.3 291.7 68 286.5 L 66 281.5 L 66 276.5 L 69 269.5 L 72.5 266 L 80.5 263 Z "/><path d="M 54.5 289 L 61.5 290 L 69 296.5 L 71 301.5 L 71 322.5 L 69 327.5 L 63.5 333 L 58.5 335 L 53.5 335 L 46.5 332 L 43 328.5 L 40 321.5 L 40 302.5 Q 41.8 301.8 41 298.5 L 46.5 292 L 54.5 289 Z "/><path d="M 98.5 400 L 107.5 402 L 113 407.5 L 115 411.5 L 115 434.5 Q 112.7 440.7 107.5 444 L 101.5 446 L 96.5 446 L 90.5 443 L 87 439.5 L 84 430.5 L 84 415.5 L 85 414.5 Q 84.3 410.3 86 408.5 L 92.5 402 L 98.5 400 Z "/><path d="M 55.5 441 L 77.5 441 L 80.5 442 L 86 446.5 L 89 451.5 L 89 460.5 Q 86.7 466.7 81.5 470 L 76.5 472 L 56.5 472 L 51.5 470 L 46 464.5 L 44 460.5 L 44 452.5 L 45 449.5 L 49.5 444 L 55.5 441 Z "/><path d="M 121.5 441 L 144.5 441 Q 150.7 443.3 154 448.5 L 156 453.5 L 156 458.5 L 154 464.5 L 148.5 470 L 146.5 470 L 143.5 472 L 122.5 472 L 116.5 469 L 113 465.5 L 111 461.5 L 110 455.5 Q 112 454.5 111 450.5 L 117.5 443 L 121.5 441 Z "/><path d="M 96.5 467 L 103.5 467 L 106.5 468 L 113 473.5 L 115 478.5 L 115 501.5 Q 113 507 108.5 510 L 104.5 512 L 95.5 512 Q 89.3 509.7 86 504.5 Q 84.3 502.7 85 498.5 L 84 497.5 L 84 482.5 L 87 473.5 L 91.5 469 L 96.5 467 Z "/></svg>'

/** Clear measurements toolbar icon. */
export const ICON_CLEAR_MEASUREMENTS = ICON_CLEAR

/** Switch background icon. */
export const ICON_SWITCH_BG =
  '<svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" fill="currentColor"/><rect x="14" y="14" width="7" height="7" fill="none" stroke="currentColor" stroke-width="1"/><path d="M12 4a8 8 0 0 1 7.25 7.25" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round"/><path d="M20.75 10 L17.25 10 L19 12.5 Z" fill="currentColor"/><path d="M12 20a8 8 0 0 1-8-8" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round"/><path d="M6 14 L2.5 14 L4 11 Z" fill="currentColor"/></svg>'

/** Review tools parent icon (pencil on a rounded square). */
export const ICON_ANNOTATION =
  '<svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 20 20" fill="none" style="fill:none"><g fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12.4 3.25H5.5A2.25 2.25 0 0 0 3.25 5.5v9A2.25 2.25 0 0 0 5.5 16.75h9A2.25 2.25 0 0 0 16.75 14.5V8.6"/><g transform="rotate(45 13.2 6.7)"><rect x="11.7" y="1.55" width="3" height="7.45" rx="1.45"/><path d="M11.7 3.2h3"/><path d="M11.7 9 13.2 12.15 14.7 9"/><rect x="12.8" y="7.05" width="0.8" height="1.2" rx="0.4"/></g></g></svg>'

/** Markup / revision cloud icon (copied from cad-viewer `revCloud.svg`). */
export const ICON_REV_CLOUD =
  '<svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 40 40"><path d="M35.29108325386048,15C37.125226253860475,12.309847399999999,36.958467253860476,9.335468299999999,34.79083925386047,7.0296237C32.62321825386047,4.53162557,29.455148253860475,4.33947164,27.120786253860473,6.4531626C24.953160253860474,4.53162512,21.951835253860473,4.53162512,19.950952253860475,6.4531626C17.783325253860475,4.53162512,14.782001253860473,4.53162512,12.781115753860474,6.4531626C10.446751353860474,4.3394711,7.111944153860474,4.53162512,4.944319853860474,7.0296228C2.9434360238604738,9.335468299999999,2.7767065138604736,12.3098459,4.610849853860474,15C2.9434466638604735,17.497998000000003,2.9434466638604735,22.694155,4.610849853860474,25C2.7767063338604734,27.690151,2.9434360238604738,30.664532,5.111060153860474,32.970377C7.278683453860474,35.468374,10.446751353860474,35.660526000000004,12.781114853860474,33.546839C14.013456253860474,34.639273,15.515264253860474,35.110636,16.949504253860475,34.960924L17.384031253860474,33.278093Q15.695761253860473,33.903341,13.886703253860473,32.299662C13.250737453860474,31.735897,12.292436853860474,31.740944,11.662447253860474,32.311378000000005Q10.430524553860474,33.426844,9.001459353860474,33.325500000000005Q7.535682953860474,33.22155,6.369870153860473,31.878052C6.355376453860474,31.861349,6.3405518538604735,31.844936,6.325405153860474,31.828825Q3.8021785638604735,29.144703,5.9879074538604735,25.938877C6.383556653860474,25.358576,6.372957753860474,24.592518,5.961405753860474,24.023384Q5.026963953860474,22.731148,5.026963953860474,20.072058Q5.026963953860474,17.378647,5.997069853860474,15.925296C6.374311253860474,15.360136,6.3706860538604735,14.6225471,5.987907653860473,14.0611229Q3.8149851238604735,10.8740788,6.203129753860473,8.1219487Q7.366510153860474,6.7812542,8.914587753860474,6.6747454Q10.427746053860474,6.570639,11.662447253860474,7.6886220000000005C12.311335753860474,8.2761691,13.304180353860474,8.261601,13.935551253860474,7.655268899999999Q16.267856253860472,5.41545445,18.845364253860474,7.700341C19.495353253860472,8.2765367,20.478888253860475,8.2569213,21.105388253860475,7.6552677Q23.437688253860475,5.41545364,26.015201253860475,7.7003412C26.651166253860474,8.2641058,27.609466253860475,8.2590561,28.239455253860474,7.6886208Q29.471375253860472,6.5731552,30.900443253860473,6.6745013Q32.36622125386047,6.7784510000000004,33.532031253860474,8.1219487C33.546527253860475,8.1386516,33.56135125386047,8.1550651,33.576497253860474,8.1711793Q36.099740253860475,10.8553152,33.91402525386047,14.0611248C33.75512825386048,14.2941837,33.65797725386047,14.5637598,33.631677253860474,14.8446045Q33.79909825386048,14.8235569,33.975852253860474,14.8257475Q34.933356253860474,14.8375826,35.59989625386047,15.52399L35.66519325386047,15.591235C35.550366253860474,15.381103,35.425664253860475,15.183288,35.29108325386048,15ZM35.966336253860476,26.182783L34.676930253860476,27.463251Q35.393826253860475,29.732494,33.53202725386048,31.878052C33.517697253860476,31.894566,33.50369225386048,31.911364,33.490022253860474,31.928431Q32.454415253860475,33.221331,30.964744253860474,33.325373Q30.004237253860474,33.392458000000005,29.149894253860474,32.951971L27.929481253860473,34.163925C30.176993253860473,35.589745,33.01140925386048,35.191897999999995,34.790837253860474,32.970377C36.64204925386047,30.837021,37.033868253860476,28.496355,35.966336253860476,26.182783Z" fill="currentColor"></path><path d="M18.34860205776758,36.08124306176758L19.51047686176758,31.58106006176758C19.601237461767578,31.22952606176758,20.042625161767578,31.109528061767577,20.301013961767577,31.36614306176758L23.55426316176758,34.59704206176758C23.808096861767577,34.84913206176758,23.69668006176758,35.27922206176758,23.35186196176758,35.378357061767574L18.936737541767577,36.647640061767575C18.586058351767576,36.74845306176758,18.257926098767577,36.43245106176758,18.34860205776758,36.08124306176758ZM21.15253496176758,30.02545706176758L24.88609836176758,33.73337206176758C25.07032536176758,33.91633406176758,25.36901856176758,33.91633406176758,25.553247461767576,33.73337206176758L36.52849006176758,22.833516161767577C36.710360061767574,22.65290166176758,36.71303206176758,22.36089566176758,36.534500061767574,22.17702746176758L32.941582061767576,18.47663122176758C32.75926806176758,18.288860715767576,32.45763906176758,18.28513235576758,32.27067206176758,18.46833832176758L21.15478106176758,29.36067706176758C20.96843986176758,29.543269061767578,20.96743176176758,29.84162706176758,21.15253496176758,30.02545706176758Z" fill="currentColor"></path></svg>'

/** Markup rectangle icon (copied from cad-viewer `revRect.svg`). */
export const ICON_REV_RECT =
  '<svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 20 20"><path d="M1.666717529296875,15.833333L1.666717529296875,4.1666666C1.666717529296875,3.24619204,2.412909569296875,2.5,3.333384129296875,2.5L16.666717529296875,2.5C17.587192529296875,2.5,18.333383529296874,3.24619204,18.333383529296874,4.1666666L18.333383529296874,9.127090500000001L17.500050529296875,8.268899000000001L17.500050529296875,4.1666666Q17.500050529296875,3.33333331,16.666717529296875,3.33333331L3.333384129296875,3.33333331Q2.500050839296875,3.33333331,2.500050839296875,4.1666666L2.500050839296875,15.833333Q2.500050839296875,16.666666,3.333384129296875,16.666666L8.404951129296876,16.666666L8.189774029296874,17.5L3.333384129296875,17.5C2.412909569296875,17.5,1.666717529296875,16.753808,1.666717529296875,15.833333ZM13.575839529296875,17.5L16.666717529296875,17.5C17.587192529296875,17.5,18.333383529296874,16.753808,18.333383529296874,15.833333L18.333383529296874,12.775434L17.500050529296875,13.602991L17.500050529296875,15.833333Q17.500050529296875,16.666666,16.666717529296875,16.666666L14.414989529296875,16.666666L13.575839529296875,17.5Z" fill="currentColor"></path><path d="M9.174291491940625,18.04064271171875L9.755228874140625,15.79055121171875C9.800609174140625,15.61478421171875,10.021303054140626,15.55478481171875,10.150497434140625,15.683092611718749L11.777121994140625,17.29854201171875C11.904038894140625,17.42458721171875,11.848330494140626,17.639632211718748,11.675921394140625,17.68919941171875L9.468359234140625,18.32384111171875C9.293019634140625,18.37424751171875,9.128953513140624,18.216246611718752,9.174291491940625,18.04064271171875ZM10.576257894140625,15.012749711718751L12.443039694140625,16.86670681171875C12.535153194140625,16.95818801171875,12.684499694140625,16.95818801171875,12.776614194140624,16.86670681171875L18.264235494140625,11.41677901171875C18.355170294140628,11.32647181171875,18.356506394140624,11.18046881171875,18.267240494140623,11.08853471171875L16.470781294140625,9.23833659271875C16.379624394140624,9.14445133871875,16.228809794140624,9.14258715871875,16.135326394140627,9.23419014371875L10.577380994140626,14.68035941171875C10.484210394140625,14.77165551171875,10.483706394140626,14.92083451171875,10.576257894140625,15.012749711718751Z" fill="currentColor"></path></svg>'

/** Markup circle icon (copied from cad-viewer `revCircle.svg`). */
export const ICON_REV_CIRCLE =
  '<svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 20 20"><path d="M17.366041494140624,8.13321261171875C16.667592494140624,4.38473101171875,13.396319494140625,1.66668701171875,9.583322994140625,1.66668701171875C5.211068394140625,1.66668701171875,1.666656494140625,5.21109891171875,1.666656494140625,9.58335351171875C1.6666564941406257,13.42974001171875,4.431342794140625,16.71955701171875,8.220290194140624,17.381800011718752L8.429374694140625,16.57206001171875C5.009032494140625,16.00730701171875,2.499989804140625,13.05000701171875,2.499989804140625,9.58335351171875C2.499989804140625,5.67133621171875,5.671305694140625,2.50002032171875,9.583322994140625,2.50002032171875C12.822601494140624,2.50002032171875,15.649155494140626,4.69743511171875,16.447924494140626,7.83668611171875Q16.522337494140626,7.82859321171875,16.600395494140624,7.82956071171875Q17.046328494140624,7.83507251171875,17.366041494140624,8.13321261171875Z" fill="currentColor"></path><path d="M9.174291491940625,18.04064271171875L9.755228874140625,15.79055121171875C9.800609174140625,15.61478421171875,10.021303054140626,15.55478481171875,10.150497434140625,15.683092611718749L11.777121994140625,17.29854201171875C11.904038894140625,17.42458721171875,11.848330494140626,17.639632211718748,11.675921394140625,17.68919941171875L9.468359234140625,18.32384111171875C9.293019634140625,18.37424751171875,9.128953513140624,18.216246611718752,9.174291491940625,18.04064271171875ZM10.576257894140625,15.012749711718751L12.443039694140625,16.86670681171875C12.535153194140625,16.95818801171875,12.684499694140625,16.95818801171875,12.776614194140624,16.86670681171875L18.264235494140625,11.41677901171875C18.355170294140628,11.32647181171875,18.356506394140624,11.18046881171875,18.267240494140623,11.08853471171875L16.470781294140625,9.23833659271875C16.379624394140624,9.14445133871875,16.228809794140624,9.14258715871875,16.135326394140627,9.23419014371875L10.577380994140626,14.68035941171875C10.484210394140625,14.77165551171875,10.483706394140626,14.92083451171875,10.576257894140625,15.012749711718751Z" fill="currentColor"></path></svg>'

/** Markup callout icon (Element Plus ChatLineSquare, same as cad-viewer). */
export const ICON_MARKUP_CALLOUT = elementPlusIcon(
  'M160 826.88 273.536 736H800a64 64 0 0 0 64-64V256a64 64 0 0 0-64-64H224a64 64 0 0 0-64 64zM296 800 147.968 918.4A32 32 0 0 1 96 893.44V256a128 128 0 0 1 128-128h576a128 128 0 0 1 128 128v416a128 128 0 0 1-128 128z',
  'M352 512h320q32 0 32 32t-32 32H352q-32 0-32-32t32-32m0-192h320q32 0 32 32t-32 32H352q-32 0-32-32t32-32'
)

/** Markup text icon (capital A, same as cad-viewer `revText.svg`). */
export const ICON_MARKUP_TEXT =
  '<svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 20 20"><path fill="currentColor" fill-rule="evenodd" d="M10 2.2 17.2 17.6h-2.8l-1.45-4.2H7.05L5.6 17.6H2.8L10 2.2Zm0 4.3L8.2 11.2h3.6L10 6.5Z"/></svg>'

/** Markup line icon (diagonal segment with endpoints). */
export const ICON_MARKUP_LINE =
  '<svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 20 20"><path fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" d="M4 16 16 4"/><circle cx="4" cy="16" r="1.6" fill="currentColor"/><circle cx="16" cy="4" r="1.6" fill="currentColor"/></svg>'

/** Markup highlight icon (filled rounded rectangle). */
export const ICON_MARKUP_HIGHLIGHT =
  '<svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 20 20"><rect x="3" y="5.5" width="14" height="9" rx="1.5" fill="currentColor" fill-opacity="0.28" stroke="currentColor" stroke-width="1.5"/></svg>'

/** Markup arrow icon (Element Plus Right, same as cad-viewer). */
export const ICON_MARKUP_ARROW = elementPlusIcon(
  'M754.752 480H160a32 32 0 1 0 0 64h594.752L521.344 777.344a32 32 0 0 0 45.312 45.312l288-288a32 32 0 0 0 0-45.312l-288-288a32 32 0 1 0-45.312 45.312z'
)

/** Markup stamp icon (Element Plus Stamp, same as cad-viewer). */
export const ICON_MARKUP_STAMP = elementPlusIcon(
  'M624 475.968V640h144a128 128 0 0 1 128 128H128a128 128 0 0 1 128-128h144V475.968a192 192 0 1 1 224 0M128 896v-64h768v64z'
)

/** Markup / review panel icon (copied from cad-viewer `markupPanel.svg`). */
export const ICON_MARKUP_PANEL =
  '<svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 20 20"><rect x="3.5" y="3" width="13" height="14" rx="1.5" fill="none" stroke="currentColor" stroke-width="1.5" /><path fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" d="M3.5 6.5h13" /><path fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" d="M6.5 9.5h7M6.5 12h7M6.5 14.5h4.5" /></svg>'

/**
 * Import icon (document + down arrow).
 * Inspired by Noun Project “import” 8131171 (Web Buttons by Elin Erkani).
 */
export const ICON_MARKUP_IMPORT =
  '<svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 20 20" fill="none" aria-hidden="true"><path stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" stroke-linecap="round" d="M4.5 2h6.4L15.5 6.6V16.5A1.5 1.5 0 0 1 14 18H4.5A1.5 1.5 0 0 1 3 16.5V3.5A1.5 1.5 0 0 1 4.5 2z"/><path stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" stroke-linecap="round" d="M10.9 2v4.6h4.6"/><path stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" d="M10 5.8v6M7.2 9.6 10 12.5l2.8-2.9"/></svg>'

/**
 * Export icon (mirrored document + up arrow).
 * Inspired by Noun Project “export file” 8131193 (Web Buttons by Elin Erkani).
 */
export const ICON_MARKUP_EXPORT =
  '<svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 20 20" fill="none" aria-hidden="true"><path stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" stroke-linecap="round" d="M15.5 2H9.1L4.5 6.6V16.5A1.5 1.5 0 0 0 6 18h9.5A1.5 1.5 0 0 0 17 16.5V3.5A1.5 1.5 0 0 0 15.5 2z"/><path stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" stroke-linecap="round" d="M9.1 2v4.6H4.5"/><path stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" d="M10 14.2V8M7.2 10.4 10 7.5l2.8 2.9"/></svg>'

/** Clear markups toolbar icon. */
export const ICON_CLEAR_MARKUPS = ICON_CLEAR

/** Show markups icon (Element Plus View, same as cad-viewer). */
export const ICON_ANNOTATION_SHOW = elementPlusIcon(
  'M512 160c320 0 512 352 512 352S832 864 512 864 0 512 0 512s192-352 512-352m0 64c-225.28 0-384.128 208.064-436.8 288 52.608 79.872 211.456 288 436.8 288 225.28 0 384.128-208.064 436.8-288-52.608-79.872-211.456-288-436.8-288m0 64a224 224 0 1 1 0 448 224 224 0 0 1 0-448m0 64a160.19 160.19 0 0 0-160 160c0 88.192 71.744 160 160 160s160-71.808 160-160-71.744-160-160-160'
)

/** Hide markups icon (Element Plus Hide, same as cad-viewer). */
export const ICON_ANNOTATION_HIDE = elementPlusIcon(
  'M876.8 156.8c0-9.6-3.2-16-9.6-22.4s-12.8-9.6-22.4-9.6-16 3.2-22.4 9.6L736 220.8c-64-32-137.6-51.2-224-60.8-160 16-288 73.6-377.6 176S0 496 0 512s48 73.6 134.4 176c22.4 25.6 44.8 48 73.6 67.2l-86.4 89.6c-6.4 6.4-9.6 12.8-9.6 22.4s3.2 16 9.6 22.4 12.8 9.6 22.4 9.6 16-3.2 22.4-9.6l704-710.4c3.2-6.4 6.4-12.8 6.4-22.4m-646.4 528Q115.2 579.2 76.8 512q43.2-72 153.6-172.8C304 272 400 230.4 512 224c64 3.2 124.8 19.2 176 44.8l-54.4 54.4C598.4 300.8 560 288 512 288c-64 0-115.2 22.4-160 64s-64 96-64 160c0 48 12.8 89.6 35.2 124.8L256 707.2c-9.6-6.4-19.2-16-25.6-22.4m140.8-96Q352 555.2 352 512c0-44.8 16-83.2 48-112s67.2-48 112-48c28.8 0 54.4 6.4 73.6 19.2zM889.599 336c-12.8-16-28.8-28.8-41.6-41.6l-48 48c73.6 67.2 124.8 124.8 150.4 169.6q-43.2 72-153.6 172.8c-73.6 67.2-172.8 108.8-284.8 115.2-51.2-3.2-99.2-12.8-140.8-28.8l-48 48c57.6 22.4 118.4 38.4 188.8 44.8 160-16 288-73.6 377.6-176S1024 528 1024 512s-48.001-73.6-134.401-176',
  'M511.998 672c-12.8 0-25.6-3.2-38.4-6.4l-51.2 51.2c28.8 12.8 57.6 19.2 89.6 19.2 64 0 115.2-22.4 160-64 41.6-41.6 64-96 64-160 0-32-6.4-64-19.2-89.6l-51.2 51.2c3.2 12.8 6.4 25.6 6.4 38.4 0 44.8-16 83.2-48 112s-67.2 48-112 48'
)

/** Language / locale picker parent icon (copied from cad-viewer `language.svg`). */
export const ICON_LANGUAGE =
  '<svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24"><path fill="currentColor" d="m18.5 10 4.4 11h-2.155l-1.201-3h-4.09l-1.199 3h-2.154L16.5 10h2zM10 2v2h6v2h-1.968a18.222 18.222 0 0 1-3.62 6.301 14.864 14.864 0 0 0 2.336 1.707l-.751 1.878A17.015 17.015 0 0 1 9 13.725 16.676 16.676 0 0 1 3.524 17.273l-.536-1.929a14.7 14.7 0 0 0 5.327-3.042A18.078 18.078 0 0 1 4.767 8h2.24A16.032 16.032 0 0 0 9 10.877 16.165 16.165 0 0 0 11.91 6.001L2 6V4h6V2h2zm7.5 10.885L16.253 16h2.492L17.5 12.885z"/></svg>'

/** Light theme toggle icon (shown when light theme is active). */
export const ICON_THEME_LIGHT =
  '<svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 20 20"><circle cx="10" cy="10" r="4" fill="currentColor"/><path fill="none" stroke="currentColor" stroke-width="1.5" d="M10 2v2M10 16v2M2 10h2M16 10h2M4.2 4.2l1.4 1.4M14.4 14.4l1.4 1.4M4.2 15.8l1.4-1.4M14.4 5.6l1.4-1.4"/></svg>'

/** Dark theme toggle icon (shown when dark theme is active). */
export const ICON_THEME_DARK =
  '<svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 20 20"><path fill="currentColor" d="M10 3a7 7 0 1 0 0 14 9 9 0 0 1 0-14Z"/></svg>'

/** Export parent icon (same document + up-arrow as cad-viewer toolbar/ribbon). */
export const ICON_EXPORT = ICON_MARKUP_EXPORT

/** Export HTML icon. */
export const ICON_EXPORT_HTML =
  '<svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 20 20"><path fill="currentColor" d="M4 3h12v14H4V3Zm2 2v2h8V5H6Zm0 4v6h8V9H6Z"/></svg>'

/** Export PDF icon. */
export const ICON_EXPORT_PDF =
  '<svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 20 20"><path fill="currentColor" d="M5 3h7l3 3v11H5V3Zm6 0v3h3"/><text x="6" y="16" fill="currentColor" font-size="5" font-family="Arial">PDF</text></svg>'

/** Export SVG icon. */
export const ICON_EXPORT_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 20 20"><path fill="none" stroke="currentColor" stroke-width="1.5" d="M4 4h12v12H4z"/><circle cx="8" cy="10" r="2" fill="currentColor"/></svg>'

/** Toolbar dock / placement parent button. */
export const ICON_TOOLBAR_PLACEMENT =
  '<svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 20 20"><rect x="3" y="3" width="14" height="14" rx="1.5" fill="none" stroke="currentColor" stroke-width="1.5"/><rect x="15" y="5" width="1.5" height="10" rx=".5" fill="currentColor"/></svg>'

export const ICON_PLACEMENT_TOP =
  '<svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 20 20"><rect x="3" y="3" width="14" height="3" rx=".5" fill="currentColor"/><rect x="5" y="8" width="10" height="9" rx="1" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>'

export const ICON_PLACEMENT_BOTTOM =
  '<svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 20 20"><rect x="5" y="3" width="10" height="9" rx="1" fill="none" stroke="currentColor" stroke-width="1.5"/><rect x="3" y="14" width="14" height="3" rx=".5" fill="currentColor"/></svg>'

export const ICON_PLACEMENT_LEFT =
  '<svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 20 20"><rect x="3" y="3" width="3" height="14" rx=".5" fill="currentColor"/><rect x="8" y="5" width="9" height="10" rx="1" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>'

export const ICON_PLACEMENT_RIGHT =
  '<svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 20 20"><rect x="5" y="5" width="9" height="10" rx="1" fill="none" stroke="currentColor" stroke-width="1.5"/><rect x="14" y="3" width="3" height="14" rx=".5" fill="currentColor"/></svg>'

/** Dock panel close button icon. */
export const ICON_DOCK_CLOSE =
  '<svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 20 20"><path fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" d="M5 5l10 10M15 5 5 15"/></svg>'

/** Dock panel side menu button icon. */
export const ICON_DOCK_SIDE_MENU =
  '<svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 20 20"><circle cx="10" cy="4" r="1.5" fill="currentColor"/><circle cx="10" cy="10" r="1.5" fill="currentColor"/><circle cx="10" cy="16" r="1.5" fill="currentColor"/></svg>'

/** Collapse toolbar (chevron toward compact edge). */
export const ICON_CHEVRON_UP =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" aria-hidden="true"><path fill="currentColor" d="M10 6.5 5.5 11h9L10 6.5Z"/></svg>'

/** Expand toolbar (chevron toward expanded edge). */
export const ICON_CHEVRON_DOWN =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" aria-hidden="true"><path fill="currentColor" d="M10 13.5 14.5 9h-9L10 13.5Z"/></svg>'

/** Collapse horizontal toolbar (chevron toward compact edge). */
export const ICON_CHEVRON_RIGHT =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" aria-hidden="true"><path fill="currentColor" d="M13.5 10 9 14.5V5.5L13.5 10Z"/></svg>'

/** Expand horizontal toolbar (chevron toward expanded edge). */
export const ICON_CHEVRON_LEFT =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" aria-hidden="true"><path fill="currentColor" d="M6.5 10 11 14.5V5.5L6.5 10Z"/></svg>'

/** Restore the view captured when an HTML export first opened. */
export const ICON_ZOOM_ORIGINAL =
  '<svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 20 20"><path fill="currentColor" d="M10 2.6 18 9.8h-2.1V17h-4.4v-4.4H8.5V17H4.1V9.8H2L10 2.6Zm0 1.8L5.3 9.8V15.8h2V11.4h5.4v4.4h2V9.8L10 4.4Z"/></svg>'

/** Show-all-layers action icon. */
export const ICON_LAYER_ON =
  '<svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 20 20"><path fill="currentColor" d="M10.09 3.53 16.09 6.97 10.09 10.29 4.18 7 10.09 3.56M10.09 2.4 2.17 7 3.31 7.65 10.09 11.45 17 7.62 18.17 7 10.08 2.37 10.09 2.4Z"/><path fill="currentColor" d="M10.25 14.83 18.17 10.22 17 9.57 10.22 13.57 3.32 9.59 2.17 10.22 10.25 14.83Z"/><path fill="currentColor" d="M10.25 17.63 18.17 13 17 12.37 10.22 16.37 3.32 12.38 2.17 13 10.25 17.63Z"/></svg>'

/** Hide-all-layers action icon. */
export const ICON_LAYER_OFF =
  '<svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 20 20"><path fill="currentColor" d="M10.09 5.15 16.09 8.59 10.09 11.91 4.18 8.59 10.09 5.15ZM10.09 4 2.17 8.61 3.31 9.25 10.09 13.06 17 9.24 18.16 8.61 10.08 4 10.09 4Z"/><path fill="currentColor" d="M10.25 16.46 18.17 11.85 17 11.2 10.22 15.2 3.32 11.21 2.17 11.85 10.25 16.46Z"/><path fill="none" stroke="currentColor" stroke-width="1.25" stroke-linecap="round" d="M3.5 3.5 16.5 16.5"/></svg>'

/** Object snap parent icon (copied from cad-viewer status-bar `osnap.svg`). */
export const ICON_OSNAP =
  '<svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24"><path fill="currentColor" fill-rule="evenodd" d="M2.25 2.25h4.878v4.878H2.25V2.25Zm.978.978v2.924h2.924V3.228H3.228Z"/><path fill="currentColor" d="M5.175 20.773V7.128H4.204V21.75H21.75V4.204H7.128v.971H20.773v15.598H5.175Z"/></svg>'

/** Orthogonal mode toggle icon. */
export const ICON_ORTHO_MODE =
  '<svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 20 20"><path fill="currentColor" fill-rule="evenodd" d="M3 2H2v16h16v-1H8v-5H3V2zm0 11v4h4v-4H3z"/></svg>'

/** Polar tracking toggle icon. */
export const ICON_POLAR_TRACKING =
  '<svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 20 20"><path fill="currentColor" fill-rule="evenodd" d="M16.98 11L18.5 11L18.5 10L16.98 10C16.86 8.13 16.05 6.44 14.8 5.2L16.88 2.83L16.12 2.17L14.05 4.54C12.79 3.57 11.21 3 9.5 3C5.36 3 2 6.36 2 10.5C2 14.64 5.36 18 9.5 18C13.47 18 16.73 14.91 16.98 11ZM15.98 10C15.86 8.43 15.18 7.01 14.14 5.95L10.6 10L15.98 10ZM13.39 5.29L8.4 11L15.98 11C15.73 14.36 12.92 17 9.5 17C5.91 17 3 14.09 3 10.5C3 6.91 5.91 4 9.5 4C10.96 4 12.31 4.48 13.39 5.29Z"/></svg>'

/** Color picker / color wheel icon. */
export const ICON_COLOR =
  '<svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24"><path fill="#e75958" d="M22 12H12l5 8.66A10 10 0 0 0 22 12Z"/><path fill="#814dff" d="M17 20.66 12 12 7 20.66A10 10 0 0 0 17 20.66Z"/><path fill="#13b0ce" d="M7 20.66 12 12H2A10 10 0 0 0 7 20.66Z"/><path fill="#4ecd83" d="M2 12H12L7 3.34A10 10 0 0 0 2 12Z"/><path fill="#ffc33f" d="M7 3.34 12 12l5-8.66A10 10 0 0 0 7 3.34Z"/><path fill="#ff9543" d="M17 3.34 12 12H22A10 10 0 0 0 17 3.34Z"/></svg>'

/** Alias for {@link ICON_ZOOM_WINDOW}. */
export const ICON_ZOOM_BOX = ICON_ZOOM_WINDOW

/** Alias for {@link ICON_MEASURE_POINT}. */
export const ICON_MEASURE_COORDINATE = ICON_MEASURE_POINT

/** Alias for {@link ICON_REV_CLOUD}. */
export const ICON_MARKUP_CLOUD = ICON_REV_CLOUD

/** Alias for {@link ICON_REV_RECT}. */
export const ICON_MARKUP_RECT = ICON_REV_RECT

/** Alias for {@link ICON_REV_CIRCLE}. */
export const ICON_MARKUP_CIRCLE = ICON_REV_CIRCLE

/** Alias for {@link ICON_ANNOTATION_SHOW}. */
export const ICON_MARKUP_SHOW = ICON_ANNOTATION_SHOW

/** Alias for {@link ICON_ANNOTATION_HIDE}. */
export const ICON_MARKUP_HIDE = ICON_ANNOTATION_HIDE

/**
 * Creates a DOM icon element from an SVG string, element, or factory.
 *
 * @param icon - Inline SVG markup, existing element, or factory function.
 * @param className - Wrapper class. Defaults to `ml-ex-ui-icon`.
 * @returns Wrapper span, or a cloned/factory element.
 */
export function createIconElement(
  icon: string | HTMLElement | (() => HTMLElement),
  className = 'ml-ex-ui-icon'
): HTMLElement {
  if (typeof icon === 'function') return icon()
  if (icon instanceof HTMLElement) return icon.cloneNode(true) as HTMLElement
  const wrapper = document.createElement('span')
  wrapper.className = className
  wrapper.innerHTML = icon
  return wrapper
}
