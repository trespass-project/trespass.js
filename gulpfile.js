const gulp = require('gulp');
const path = require('path');
const rimraf = require('rimraf');
const docco = require('gulp-docco');
const sass = require('gulp-sass');
const gulpSequence = require('gulp-sequence');
const changed = require('gulp-changed');

const srcDir = './src';
const sourceFilePattern = path.join(srcDir, '**/*.js');
const docsDir = './docs';
const docsFilePattern = sourceFilePattern;
const doccoSassFilename = 'docco.scss';
const doccoSassPattern = path.join(srcDir, doccoSassFilename);


gulp.task('docco:sass', () => {
	return gulp.src(path.join(srcDir, doccoSassFilename))
		.pipe(sass({
			// indentedSyntax: true,
			errLogToConsole: true
		}))
		.pipe(
			gulp.dest(path.join(docsDir))
		);
});

gulp.task('docco:rm-fonts', (cb) => {
	const p = path.join(docsDir, 'public', 'fonts');
	rimraf(p, cb);
});

gulp.task('docco:clean', (cb) => {
	rimraf(docsDir, cb);
});

gulp.task('docco:docco', () => {
	return gulp.src(docsFilePattern)
		.pipe(changed(docsDir)) // incremental build
		.pipe(docco({
			// css: 'path/to/custom/docco.css'
		}))
		.pipe(gulp.dest(docsDir));
});

gulp.task('docco', (cb) => {
	gulpSequence('docco:clean', 'docco:docco', ['docco:sass', 'docco:rm-fonts'], cb);
});


gulp.task('watch', () => {
	gulp.watch(sourceFilePattern, ['docco']);
	gulp.watch(doccoSassPattern, ['docco:sass']);
});


gulp.task('default', ['watch', 'docco']);
