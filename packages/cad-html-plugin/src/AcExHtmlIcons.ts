/** Inline SVG icons (from cad-viewer) for the offline HTML shell. */

const ICON_ZOOM_EXTENT =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" aria-hidden="true"><path fill="currentColor" d="M9.3333 14.125 5.875 10.6667V14.125H9.3333Zm4.7917-3.4583-3.4583 3.4583H14.125V10.6667ZM10.6667 5.875 14.125 9.3333V5.875H10.6667ZM5.875 9.3333 9.3333 5.875H5.875V9.3333Zm9.2083 5.475c1.2333-1.3 1.9083-3.0333 1.9083-4.825-.0083-3.325-2.35-6.1833-5.6083-6.8417C8.125 2.4833 4.85 4.2 3.55 7.2583c-1.3 3.0583-.275 6.6083 2.4583 8.5 2.725 1.8917 6.4167 1.6 8.8167-.6917.0917-.0833.175-.175.2583-.2583Zm1.2583.5917 2.575 2.575c-.3167.3167-.625.625-.9417.9417-.8583-.8583-1.7167-1.7167-2.575-2.575-3.4083 2.9-8.4917 2.5917-11.525-.6917S.9417 7.275 4.1083 4.1083C7.2667.9417 12.3667.8417 15.65 3.875s3.5917 8.1167.6917 11.525Z"/></svg>'

const ICON_MEASURE_DISTANCE =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" aria-hidden="true"><path fill="currentColor" d="M3.75 9.25h12.5v1.5H3.75v-1.5ZM2.25 6.5h1.5v7h-1.5v-7ZM16.25 6.5h1.5v7h-1.5v-7Z"/></svg>'

const ICON_MEASURE_ANGLE =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" aria-hidden="true"><polygon fill="currentColor" points="5.74 7.13 7 9.5 4.15 7.72 3.2 7.12 3 7 7 4.5 6.17 6.05 5.67 7 5.74 7.13"/><polygon fill="currentColor" points="16 12.5 13.5 16.5 12.66 15.15 11.92 13.97 11 12.5 12 13.03 12.98 13.55 13.5 13.83 16 12.5"/><rect fill="currentColor" x="2" y="2.5" width="1" height="15"/><rect fill="currentColor" x="3" y="16.5" width="15" height="1"/><path fill="currentColor" d="M14,13c0,.18,0,.37,0,.55v0a6.82,6.82,0,0,1-.32,1.57l-.74-1.18L13,13.5c0-.14,0-.31,0-.47v0a6,6,0,0,0-6-6,6.74,6.74,0,0,0-1.26.13l-.29.07a5.61,5.61,0,0,0-1.3.52l-1-.6a7.07,7.07,0,0,1,2-.88,6.78,6.78,0,0,1,1-.19A7.7,7.7,0,0,1,7,6a7,7,0,0,1,7,7Z"/></svg>'

const ICON_MEASURE_ARC =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" aria-hidden="true"><rect fill="currentColor" x="2" y="16" width="2" height="2"/><rect fill="currentColor" x="16" y="2" width="2" height="2"/><rect fill="currentColor" x="6.1" y="6.11" width="2" height="2"/><path fill="currentColor" d="M4.99,9.11c-1.15,1.74-1.94,3.74-2.24,5.89h.81c.32-2.18,1.16-4.18,2.39-5.89h-.96Z"/><path fill="currentColor" d="M9.1,5v.96c1.71-1.23,3.72-2.07,5.9-2.4v-.81c-2.16,.3-4.16,1.09-5.9,2.24Z"/></svg>'

const ICON_MEASURE_AREA =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" aria-hidden="true"><path fill="currentColor" fill-rule="evenodd" d="M4 4h12v12H4V4Zm1.5 1.5v9h9v-9h-9Z"/><circle fill="currentColor" cx="4" cy="4" r="1.5"/><circle fill="currentColor" cx="16" cy="4" r="1.5"/><circle fill="currentColor" cx="4" cy="16" r="1.5"/><circle fill="currentColor" cx="16" cy="16" r="1.5"/></svg>'

const ICON_MEASURE_COORDINATE =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" aria-hidden="true"><path fill="currentColor" d="M9.25 2h1.5v5.25H16v1.5h-5.25V16h-1.5v-7.25H4v-1.5h5.25V2Z"/><circle fill="currentColor" cx="10" cy="10" r="1.75"/></svg>'

/** Shared trash icon for clear-measurements / clear-markups (matched size). */
const ICON_CLEAR =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" aria-hidden="true"><path fill="currentColor" d="M7.5 3.5h5v1.2h3.2v1.4H4.3V4.7h3.2V3.5zm-2 4.1h9.2l-.7 8.2a1.5 1.5 0 0 1-1.5 1.4H7.5a1.5 1.5 0 0 1-1.5-1.4L5.5 7.6zm2.2 1.6-.4 5.4h1.4l.4-5.4H7.7zm3.6 0-.4 5.4h1.4l.4-5.4h-1.4z"/></svg>'

const ICON_LAYER =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="32" d="m434.8 137.65-149.36-68.1c-16.19-7.4-42.69-7.4-58.88 0L77.3 137.65c-17.6 8-17.6 21.09 0 29.09l148 67.5c16.89 7.7 44.69 7.7 61.58 0l148-67.5c17.52-8 17.52-21.1-.08-29.09M160 308.52l-82.7 37.11c-17.6 8-17.6 21.1 0 29.1l148 67.5c16.89 7.69 44.69 7.69 61.58 0l148-67.5c17.6-8 17.6-21.1 0-29.1l-79.94-38.47"/><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="32" d="m160 204.48-82.8 37.16c-17.6 8-17.6 21.1 0 29.1l148 67.49c16.89 7.7 44.69 7.7 61.58 0l148-67.49c17.7-8 17.7-21.1.1-29.1L352 204.48"/></svg>'

const ICON_ZOOM_BOX =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" aria-hidden="true"><path fill="currentColor" d="M15.0833 14.8083c1.2333-1.3 1.9083-3.0333 1.9083-4.825-.0083-3.325-2.35-6.1833-5.6083-6.8417C8.125 2.4833 4.85 4.2 3.55 7.2583c-1.3 3.0583-.275 6.6083 2.4583 8.5 2.725 1.8917 6.4167 1.6 8.8167-.6917.0917-.0833.175-.175.2583-.2583Zm1.2583.5917 2.575 2.575c-.3167.3167-.625.625-.9417.9417-.8583-.8583-1.7167-1.7167-2.575-2.575-3.4083 2.9-8.4917 2.5917-11.525-.6917C.8417 12.3667.9417 7.275 4.1083 4.1083 7.2667.9417 12.3667.8417 15.65 3.875s3.5917 8.1167.6917 11.525Zm-3.55-2.6083V7.2083H7.2083v5.5833h5.5833ZM5.875 5.875h8.25v8.25H5.875V5.875Z"/></svg>'

const ICON_LAYER_ON =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" aria-hidden="true"><path fill="currentColor" d="M10.09 3.53 16.09 6.97 10.09 10.29 4.18 7 10.09 3.56M10.09 2.4 2.17 7 3.31 7.65 10.09 11.45 17 7.62 18.17 7 10.08 2.37 10.09 2.4Z"/><path fill="currentColor" d="M10.25 14.83 18.17 10.22 17 9.57 10.22 13.57 3.32 9.59 2.17 10.22 10.25 14.83Z"/><path fill="currentColor" d="M10.25 17.63 18.17 13 17 12.37 10.22 16.37 3.32 12.38 2.17 13 10.25 17.63Z"/></svg>'

const ICON_LAYER_OFF =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" aria-hidden="true"><path fill="currentColor" d="M10.09 5.15 16.09 8.59 10.09 11.91 4.18 8.59 10.09 5.15ZM10.09 4 2.17 8.61 3.31 9.25 10.09 13.06 17 9.24 18.16 8.61 10.08 4 10.09 4Z"/><path fill="currentColor" d="M10.25 16.46 18.17 11.85 17 11.2 10.22 15.2 3.32 11.21 2.17 11.85 10.25 16.46Z"/><path fill="currentColor" d="M3.5 3.5 16.5 16.5" stroke="currentColor" stroke-width="1.25" stroke-linecap="round"/></svg>'

const ICON_LANGUAGE =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="m18.5 10 4.4 11h-2.155l-1.201-3h-4.09l-1.199 3h-2.154L16.5 10h2zM10 2v2h6v2h-1.968a18.222 18.222 0 0 1-3.62 6.301 14.864 14.864 0 0 0 2.336 1.707l-.751 1.878A17.015 17.015 0 0 1 9 13.725 16.676 16.676 0 0 1 3.524 17.273l-.536-1.929a14.7 14.7 0 0 0 5.327-3.042A18.078 18.078 0 0 1 4.767 8h2.24A16.032 16.032 0 0 0 9 10.877 16.165 16.165 0 0 0 11.91 6.001L2 6V4h6V2h2zm7.5 10.885L16.253 16h2.492L17.5 12.885z"/></svg>'

const ICON_SETTING =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" aria-hidden="true"><path fill="currentColor" d="M600.704 64a32 32 0 0 1 30.464 22.208l35.2 109.376c14.784 7.232 28.928 15.36 42.432 24.512l112.384-24.192a32 32 0 0 1 34.432 15.36L944.32 364.8a32 32 0 0 1-4.032 37.504l-77.12 85.12a357 357 0 0 1 0 49.024l77.12 85.248a32 32 0 0 1 4.032 37.504l-88.704 153.6a32 32 0 0 1-34.432 15.296L708.8 803.904c-13.44 9.088-27.648 17.28-42.368 24.512l-35.264 109.376A32 32 0 0 1 600.704 960H423.296a32 32 0 0 1-30.464-22.208L357.696 828.48a352 352 0 0 1-42.56-24.64l-112.32 24.256a32 32 0 0 1-34.432-15.36L79.68 659.2a32 32 0 0 1 4.032-37.504l77.12-85.248a357 357 0 0 1 0-48.896l-77.12-85.248A32 32 0 0 1 79.68 364.8l88.704-153.6a32 32 0 0 1 34.432-15.296l112.32 24.256c13.568-9.152 27.776-17.408 42.56-24.64l35.2-109.312A32 32 0 0 1 423.232 64H600.64zm-23.424 64H446.72l-36.352 113.088l-24.512 11.968a294 294 0 0 0-34.816 20.096l-22.656 15.36l-116.224-25.088l-65.28 113.152l79.68 88.192l-1.92 27.136a293 293 0 0 0 0 40.192l1.92 27.136l-79.808 88.192l65.344 113.152l116.224-25.024l22.656 15.296a294 294 0 0 0 34.816 20.096l24.512 11.968L446.72 896h130.688l36.48-113.152l24.448-11.904a288 288 0 0 0 34.752-20.096l22.592-15.296l116.288 25.024l65.28-113.152l-79.744-88.192l1.92-27.136a293 293 0 0 0 0-40.256l-1.92-27.136l79.808-88.128l-65.344-113.152l-116.288 24.96l-22.592-15.232a288 288 0 0 0-34.752-20.096l-24.448-11.904L577.344 128zM512 320a192 192 0 1 1 0 384a192 192 0 0 1 0-384m0 64a128 128 0 1 0 0 256a128 128 0 0 0 0-256"/></svg>'

const ICON_ORTHO_MODE =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" aria-hidden="true"><path fill="currentColor" fill-rule="evenodd" d="M3 2H2v16h16v-1H8v-5H3V2zm0 11v4h4v-4H3z"/></svg>'

const ICON_POLAR_TRACKING =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" aria-hidden="true"><path fill="currentColor" fill-rule="evenodd" d="M16.98 11L18.5 11L18.5 10L16.98 10C16.86 8.13 16.05 6.44 14.8 5.2L16.88 2.83L16.12 2.17L14.05 4.54C12.79 3.57 11.21 3 9.5 3C5.36 3 2 6.36 2 10.5C2 14.64 5.36 18 9.5 18C13.47 18 16.73 14.91 16.98 11ZM15.98 10C15.86 8.43 15.18 7.01 14.14 5.95L10.6 10L15.98 10ZM13.39 5.29L8.4 11L15.98 11C15.73 14.36 12.92 17 9.5 17C5.91 17 3 14.09 3 10.5C3 6.91 5.91 4 9.5 4C10.96 4 12.31 4.48 13.39 5.29Z"/></svg>'

const ICON_COLOR =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" aria-hidden="true"><path fill="#e75958" d="M22 12H12l5 8.66A10 10 0 0 0 22 12Z"/><path fill="#814dff" d="M17 20.66 12 12 7 20.66A10 10 0 0 0 17 20.66Z"/><path fill="#13b0ce" d="M7 20.66 12 12H2A10 10 0 0 0 7 20.66Z"/><path fill="#4ecd83" d="M2 12H12L7 3.34A10 10 0 0 0 2 12Z"/><path fill="#ffc33f" d="M7 3.34 12 12l5-8.66A10 10 0 0 0 7 3.34Z"/><path fill="#ff9543" d="M17 3.34 12 12H22A10 10 0 0 0 17 3.34Z"/></svg>'

const ICON_CHEVRON_UP =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" aria-hidden="true"><path fill="currentColor" d="M10 6.5 5.5 11h9L10 6.5Z"/></svg>'

const ICON_CHEVRON_DOWN =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" aria-hidden="true"><path fill="currentColor" d="M10 13.5 14.5 9h-9L10 13.5Z"/></svg>'

const ICON_MEASURE =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" aria-hidden="true"><path fill="currentColor" fill-rule="evenodd" d="M1.5 7h17v6h-17ZM4.25 7h1v2.5h-1ZM7.5 7h.75v1.5H7.5ZM10.25 7h1v2.5h-1ZM13.5 7h.75v1.5H13.5ZM16.25 7h1v2.5h-1Z"/></svg>'

const ICON_ANNOTATION =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="none" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12.4 3.25H5.5A2.25 2.25 0 0 0 3.25 5.5v9A2.25 2.25 0 0 0 5.5 16.75h9A2.25 2.25 0 0 0 16.75 14.5V8.6"/><g transform="rotate(45 13.2 6.7)"><rect x="11.7" y="1.55" width="3" height="7.45" rx="1.45"/><path d="M11.7 3.2h3"/><path d="M11.7 9 13.2 12.15 14.7 9"/><rect x="12.8" y="7.05" width="0.8" height="1.2" rx="0.4"/></g></g></svg>'

const ICON_MARKUP_CLOUD =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" aria-hidden="true"><path fill="currentColor" d="M4.2 13.2c-1.1 0-2-.9-2-2 0-.9.6-1.7 1.4-1.9C3.5 7.6 4.9 6.5 6.6 6.5c.5 0 1 .1 1.4.3C8.6 5.4 9.9 4.7 11.4 4.7c2.3 0 4.2 1.7 4.5 3.9.9.3 1.6 1.2 1.6 2.2 0 1.3-1 2.4-2.3 2.4H4.2z"/></svg>'

const ICON_MARKUP_CALLOUT =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" aria-hidden="true"><path fill="currentColor" d="M3.5 3.5h13v9H8.2L5 15.2V12.5H3.5v-9zm1.5 1.5v6h1.5v1.6L8.8 11H15V5H5zm2 2.5h6v1.2H7V7.5zm0 2.5h4.5v1.2H7V10z"/></svg>'

const ICON_MARKUP_TEXT =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" aria-hidden="true"><path fill="currentColor" d="M4 4.5h12v1.6H11.2V15.5H8.8V6.1H4V4.5z"/></svg>'

const ICON_MARKUP_RECT =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" aria-hidden="true"><path fill="currentColor" fill-rule="evenodd" d="M3.5 4.5h13v11h-13v-11zm1.5 1.5v8h10v-8H5z"/></svg>'

const ICON_MARKUP_CIRCLE =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" aria-hidden="true"><path fill="currentColor" fill-rule="evenodd" d="M10 3.2a6.8 6.8 0 1 1 0 13.6 6.8 6.8 0 0 1 0-13.6zm0 1.5a5.3 5.3 0 1 0 0 10.6 5.3 5.3 0 0 0 0-10.6z"/></svg>'

const ICON_MARKUP_ARROW =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" aria-hidden="true"><path fill="currentColor" d="M3.5 9.25h9.2L9.4 6 10.5 5l5 5-5 5-1.1-1 3.3-3.25H3.5v-1.5z"/></svg>'

const ICON_MARKUP_STAMP =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" aria-hidden="true"><path fill="currentColor" d="M7.2 3.5a2.8 2.8 0 0 1 5.6 0v3.2h1.4A2.2 2.2 0 0 1 16.4 9v2.2H3.6V9a2.2 2.2 0 0 1 2.2-2.3h1.4V3.5zm1.5 0v3.2h2.6V3.5a1.3 1.3 0 0 0-2.6 0zM3.5 14.2h13v2.3h-13v-2.3z"/></svg>'

const ICON_MARKUP_IMPORT =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" aria-hidden="true"><path fill="currentColor" d="M9.25 3.5h1.5v7.2l2.4-2.4 1.05 1.05L10 14.05 5.8 9.85l1.05-1.05 2.4 2.4V3.5zM3.5 15.5h13v1.5h-13v-1.5z"/></svg>'

const ICON_MARKUP_EXPORT =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" aria-hidden="true"><path fill="currentColor" d="M9.25 12.5h1.5V5.3l2.4 2.4 1.05-1.05L10 2.95 5.8 7.15l1.05 1.05 2.4-2.4V12.5zM3.5 15.5h13v1.5h-13v-1.5z"/></svg>'

const ICON_MARKUP_SHOW =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" aria-hidden="true"><path fill="currentColor" d="M512 160c320 0 512 352 512 352S832 864 512 864 0 512 0 512s192-352 512-352m0 64c-225.28 0-384.128 208.064-436.8 288 52.608 79.872 211.456 288 436.8 288 225.28 0 384.128-208.064 436.8-288-52.608-79.872-211.456-288-436.8-288m0 64a224 224 0 1 1 0 448 224 224 0 0 1 0-448m0 64a160.19 160.19 0 0 0-160 160c0 88.192 71.744 160 160 160s160-71.808 160-160-71.744-160-160-160"/></svg>'

const ICON_MARKUP_HIDE =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" aria-hidden="true"><path fill="currentColor" d="M876.8 156.8c0-9.6-3.2-16-9.6-22.4s-12.8-9.6-22.4-9.6-16 3.2-22.4 9.6L736 220.8c-64-32-137.6-51.2-224-60.8-160 16-288 73.6-377.6 176S0 496 0 512s48 73.6 134.4 176c22.4 25.6 44.8 48 73.6 67.2l-86.4 89.6c-6.4 6.4-9.6 12.8-9.6 22.4s3.2 16 9.6 22.4 12.8 9.6 22.4 9.6 16-3.2 22.4-9.6l704-710.4c3.2-6.4 6.4-12.8 6.4-22.4m-646.4 528Q115.2 579.2 76.8 512q43.2-72 153.6-172.8C304 272 400 230.4 512 224c64 3.2 124.8 19.2 176 44.8l-54.4 54.4C598.4 300.8 560 288 512 288c-64 0-115.2 22.4-160 64s-64 96-64 160c0 48 12.8 89.6 35.2 124.8L256 707.2c-9.6-6.4-19.2-16-25.6-22.4m140.8-96Q352 555.2 352 512c0-44.8 16-83.2 48-112s67.2-48 112-48c28.8 0 54.4 6.4 73.6 19.2zM889.599 336c-12.8-16-28.8-28.8-41.6-41.6l-48 48c73.6 67.2 124.8 124.8 150.4 169.6q-43.2 72-153.6 172.8c-73.6 67.2-172.8 108.8-284.8 115.2-51.2-3.2-99.2-12.8-140.8-28.8l-48 48c57.6 22.4 118.4 38.4 188.8 44.8 160-16 288-73.6 377.6-176S1024 528 1024 512s-48.001-73.6-134.401-176"/><path fill="currentColor" d="M511.998 672c-12.8 0-25.6-3.2-38.4-6.4l-51.2 51.2c28.8 12.8 57.6 19.2 89.6 19.2 64 0 115.2-22.4 160-64 41.6-41.6 64-96 64-160 0-32-6.4-64-19.2-89.6l-51.2 51.2c3.2 12.8 6.4 25.6 6.4 38.4 0 44.8-16 83.2-48 112s-67.2 48-112 48"/></svg>'

/**
 * Inline SVG markup keyed by toolbar / layer UI usage.
 * Each value is a complete `<svg>…</svg>` string using `currentColor`.
 */
export const acExHtmlIcons = {
  /** Zoom-to-extents toolbar icon. */
  zoomExtent: ICON_ZOOM_EXTENT,
  /** Measure-distance toolbar icon. */
  measureDistance: ICON_MEASURE_DISTANCE,
  /** Measure-angle toolbar icon. */
  measureAngle: ICON_MEASURE_ANGLE,
  /** Measure-arc-length toolbar icon. */
  measureArc: ICON_MEASURE_ARC,
  /** Measure-area toolbar icon. */
  measureArea: ICON_MEASURE_AREA,
  /** Measure-coordinate toolbar icon. */
  measureCoordinate: ICON_MEASURE_COORDINATE,
  /** Clear-measurements toolbar icon (same glyph as clear markups). */
  clearMeasurements: ICON_CLEAR,
  /** Open layer drawer toolbar icon. */
  layer: ICON_LAYER,
  /** Per-layer zoom-to-box button icon. */
  zoomBox: ICON_ZOOM_BOX,
  /** “Show all layers” action icon. */
  layerOn: ICON_LAYER_ON,
  /** “Hide all layers” action icon. */
  layerOff: ICON_LAYER_OFF,
  /** Language switch toolbar icon. */
  language: ICON_LANGUAGE,
  /** Measure settings toolbar icon. */
  setting: ICON_SETTING,
  /** Orthogonal mode toggle icon. */
  orthoMode: ICON_ORTHO_MODE,
  /** Polar tracking toggle icon. */
  polarTracking: ICON_POLAR_TRACKING,
  /** Measure color picker icon. */
  color: ICON_COLOR,
  /** Collapse toolbar (chevron up). */
  chevronUp: ICON_CHEVRON_UP,
  /** Expand toolbar (chevron down). */
  chevronDown: ICON_CHEVRON_DOWN,
  /** Measure tools parent menu icon. */
  measure: ICON_MEASURE,
  /** Review / annotation tools parent menu icon. */
  annotation: ICON_ANNOTATION,
  /** Markup revision cloud. */
  markupCloud: ICON_MARKUP_CLOUD,
  /** Markup callout. */
  markupCallout: ICON_MARKUP_CALLOUT,
  /** Markup text. */
  markupText: ICON_MARKUP_TEXT,
  /** Markup rectangle. */
  markupRect: ICON_MARKUP_RECT,
  /** Markup circle. */
  markupCircle: ICON_MARKUP_CIRCLE,
  /** Markup arrow. */
  markupArrow: ICON_MARKUP_ARROW,
  /** Markup stamp. */
  markupStamp: ICON_MARKUP_STAMP,
  /** Import markup sidecar JSON. */
  markupImport: ICON_MARKUP_IMPORT,
  /** Export markup sidecar JSON. */
  markupExport: ICON_MARKUP_EXPORT,
  /** Show markups (open eye). */
  markupShow: ICON_MARKUP_SHOW,
  /** Hide markups (slashed eye). */
  markupHide: ICON_MARKUP_HIDE,
  /** @deprecated Prefer {@link markupHide} / {@link markupShow}. */
  markupVisibility: ICON_MARKUP_HIDE,
  /** Clear all markups. */
  clearMarkups: ICON_CLEAR
} as const

/**
 * Builds an HTML toolbar `<button>` with an inline icon and extra attributes.
 *
 * @param icon - SVG markup from {@link acExHtmlIcons}.
 * @param title - Default `title` and `aria-label` before i18n overrides.
 * @param attrs - Additional attributes (e.g. `data-action`, `data-i18n-key`).
 * @returns HTML string for one toolbar button.
 */
export function acExToolbarButton(
  icon: string,
  title: string,
  attrs: Record<string, string>
): string {
  const attrStr = Object.entries(attrs)
    .map(([key, value]) => `${key}="${escapeAttr(value)}"`)
    .join(' ')
  return `<button type="button" class="mlcad-tool-btn" title="${escapeAttr(title)}" aria-label="${escapeAttr(title)}" ${attrStr}>${icon}</button>`
}

/**
 * Builds a flyout menu item with icon + label (cad-simple-ui-plugin style).
 *
 * @param icon - SVG markup from {@link acExHtmlIcons}.
 * @param label - Default visible label before i18n overrides.
 * @param attrs - Additional attributes (e.g. `data-action`, `data-i18n-key`).
 */
export function acExDropdownItem(
  icon: string,
  label: string,
  attrs: Record<string, string>
): string {
  const attrStr = Object.entries(attrs)
    .map(([key, value]) => `${key}="${escapeAttr(value)}"`)
    .join(' ')
  const i18nKey = attrs['data-i18n-key']
  const labelAttrs = i18nKey
    ? ` data-i18n-key="${escapeAttr(i18nKey)}" data-i18n-text`
    : ''
  return `<button type="button" class="mlcad-dropdown-item" role="menuitem" title="${escapeAttr(label)}" ${attrStr}><span class="mlcad-dropdown-icon" aria-hidden="true">${icon}</span><span class="mlcad-dropdown-label"${labelAttrs}>${escapeAttr(label)}</span></button>`
}

function escapeAttr(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
}
