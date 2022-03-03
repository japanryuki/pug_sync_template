"use strict";
const fs = require("fs");
const rimraf = require("rimraf");

const { src, dest, watch, series, parallel } = require("gulp");

const pug = require("gulp-pug");
const data = require("gulp-data");
const beautify = require("gulp-html-beautify");
const htmlhint = require("gulp-htmlhint");

const sass = require("gulp-sass");
const csscomb = require("gulp-csscomb");
const autoprefixer = require("gulp-autoprefixer");
const sassGlob = require("gulp-sass-glob");

const header = require("gulp-header");
const ignore = require("gulp-ignore");
const rename = require("gulp-rename");
const plumber = require("gulp-plumber");
const replace = require("gulp-replace");
const browserSync = require("browser-sync");
const convertEncoding = require("gulp-convert-encoding");
const lineEndingCorrector = require("gulp-line-ending-corrector");

// check os
const os = require("os"),
  Windows = os.type().toString().match("Windows") !== null ? true : false;

// path
const basePath = process.cwd(),
  DEV_PATH = Windows ? basePath + "/src" : "./src",
  DIST_PATH = Windows ? basePath + "/dist" : "./dist",
  PUB_PATH = Windows ? basePath + "/htdocs" : "./htdocs",
  CMN_PATH = Windows ? basePath + "/common" : "./common";

let OUTPUT_CASE, OUTPUT_PATH;

// set val
const setDev = (done) => {
  OUTPUT_CASE = "dev";
  OUTPUT_PATH = DIST_PATH;
  done();
};
const setPub = (done) => {
  OUTPUT_CASE = "pub";
  OUTPUT_PATH = PUB_PATH;
  done();
};

// clean
const clean = (cb) => {
  rimraf(OUTPUT_PATH, cb);
};

// pug
const html = () => {
  return src(`${DEV_PATH}/pug/**/!(_)*.pug`)
    .pipe(plumber())
    .pipe(
      data((file) => {
        const slash = Windows ? "\\" : "/";
        const PATH = file.path
          .split(Windows ? "pug\\" : "pug/")[1]
          .replace(".pug", ".html")
          .replace(/index\.html$/, "");
        const ROOT = `..${slash}`.repeat([PATH.split(slash).length - 1]);
        return {
          PATH,
          ROOT,
        };
      })
    )
    .pipe(
      pug({
        OUTPUT_CASE: OUTPUT_CASE,
      })
    )
    .pipe(rename({ extname: ".html" }))
    .pipe(
      beautify({
        indent_size: 2,
        max_preserve_newlines: 1,
      })
    )
    .pipe(dest(`${OUTPUT_PATH}`));
};

const validateHTML = () => {
  return src(`${OUTPUT_PATH}/**/*.html`)
    .pipe(
      htmlhint({
        "spec-char-escape": false,
      })
    )
    .pipe(htmlhint.reporter());
};

// css
const css = () => {
  return src(`${DEV_PATH}/scss/**/!(_)*.scss`)
    .pipe(plumber())
    .pipe(sassGlob())
    .pipe(sass())
    .pipe(csscomb())
    .pipe(
      autoprefixer({
        cascade: false,
        grid: true,
      })
    )
    .pipe(replace(/@charset (.*?);/g, ""))
    .pipe(header('@charset "Shift_JIS";\n'))
    .pipe(
      rename((path) => {
        path.dirname += "/assets/css";
      })
    )
    .pipe(dest(`${OUTPUT_PATH}`));
};

// static
const staticFiles = () => {
  return src([`${DEV_PATH}/static/**/*`, `!${DEV_PATH}/static/_template/**/*`])
    .pipe(ignore.include({ isFile: true }))
    .pipe(dest(`${OUTPUT_PATH}`));
};

// shift_jis convert
const convertFIles = () => {
  return src([`${OUTPUT_PATH}/**/*.html`, `${OUTPUT_PATH}/**/*.css`])
    .pipe(
      lineEndingCorrector({
        verbose: false,
        eolc: "CRLF",
      })
    )
    .pipe(convertEncoding({ to: "shift_jis" }))
    .pipe(dest(`${OUTPUT_PATH}`));
};

// serve
const serve = (done) => {
  browserSync({
    server: {
      baseDir: [CMN_PATH, DIST_PATH],
    },
    port: 3000,
    open: "external",
    startPath: "/",
  });
  done();
};

// watch
const watchFiles = () => {
  watch(`${DEV_PATH}/pug/**/*.pug`, series(html, validateHTML));
  watch(`${DEV_PATH}/scss/**/*.scss`, series(css));
  watch(`${DEV_PATH}/**/*`, series(staticFiles));
};

const buildFIles = series(clean, parallel(html, css, staticFiles), validateHTML);

exports.build = series(setDev, buildFIles);
exports.dev = series(setDev, buildFIles, serve, watchFiles);
exports.preview = series(setDev, buildFIles, convertFIles);
exports.publish = series(setPub, buildFIles, convertFIles);
