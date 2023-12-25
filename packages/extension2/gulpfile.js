"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const gulp_1 = tslib_1.__importDefault(require("gulp"));
const rimraf_1 = tslib_1.__importDefault(require("rimraf"));
const ensure_icons_1 = require("../../scripts/ensure-icons");
const child_process_1 = tslib_1.__importDefault(require("child_process"));
const path = tslib_1.__importStar(require("path"));
const nodeWebpack = path.join(__dirname, '..', '..', 'scripts', 'run-webpack.js');
function cypressIcons() {
    return tslib_1.__awaiter(this, void 0, void 0, function* () {
        yield (0, ensure_icons_1.waitUntilIconsBuilt)();
        return require(process.argv[1]+'/../packages/icons');
    });
}
const clean = (done) => {
    (0, rimraf_1.default)('dist', done);
};
const manifest = (v) => {
    return () => {
        return gulp_1.default.src(`app/${v}/manifest.json`)
            .pipe(gulp_1.default.dest(`dist/${v}`));
    };
};
const background = (cb) => {
    child_process_1.default.fork(nodeWebpack, { stdio: 'inherit' }).on('exit', (code) => {
        cb(code === 0 ? null : new Error(`Webpack process exited with code ${code}`));
    });
};
const copyScriptsForV3 = () => {
    return gulp_1.default.src('app/v3/*.js')
        .pipe(gulp_1.default.dest('dist/v3'));
};
const html = () => {
    return gulp_1.default.src('app/**/*.html')
        .pipe(gulp_1.default.dest('dist/v2'))
        .pipe(gulp_1.default.dest('dist/v3'));
};
const css = () => {
    return gulp_1.default.src('app/**/*.css')
        .pipe(gulp_1.default.dest('dist/v2'))
        .pipe(gulp_1.default.dest('dist/v3'));
};
const icons = () => tslib_1.__awaiter(void 0, void 0, void 0, function* () {
    const cyIcons = yield cypressIcons();
    return gulp_1.default.src([
        cyIcons.getPathToIcon('icon_16x16.png'),
        cyIcons.getPathToIcon('icon_19x19.png'),
        cyIcons.getPathToIcon('icon_38x38.png'),
        cyIcons.getPathToIcon('icon_48x48.png'),
        cyIcons.getPathToIcon('icon_128x128.png'),
    ])
        .pipe(gulp_1.default.dest('dist/v2/icons'))
        .pipe(gulp_1.default.dest('dist/v3/icons'));
});
const logos = () => tslib_1.__awaiter(void 0, void 0, void 0, function* () {
    const cyIcons = yield cypressIcons();
    // appease TS
    return gulp_1.default.src([
        cyIcons.getPathToLogo('cypress-bw.png'),
    ])
        .pipe(gulp_1.default.dest('dist/v2/logos'))
        .pipe(gulp_1.default.dest('dist/v3/logos'));
});
const build = gulp_1.default.series(clean, gulp_1.default.parallel(icons, logos, manifest('v2'), manifest('v3'), background, copyScriptsForV3, html, css));
const watchBuild = () => {
    return gulp_1.default.watch('app/**/*', build);
};
const watch = gulp_1.default.series(build, watchBuild);
module.exports = {
    build,
    clean,
    watch,
};
