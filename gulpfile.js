var gulp = require('gulp');
var webpack = require('gulp-webpack');
var rename = require('gulp-rename');
var mocha = require('gulp-mocha');
var notifier = require('node-notifier');
var path = require('path');
var rimraf = require('rimraf');
var docco = require('gulp-docco');
var sass = require('gulp-sass');
var gulpSequence = require('gulp-sequence');
var changed = require('gulp-changed');

var name = 'trespass';
var src_dir = './src';
var output_dir = './dist';
var main_filename = 'trespass.js';
var main_filepath = path.join(src_dir, main_filename);
var source_file_pattern = path.join(src_dir, '**/*.js');
var test_dir = './test';
var test_file_pattern = path.join(test_dir, '*.js');
var docs_dir = './docs';
var docs_file_pattern = source_file_pattern;
var docco_sass_filename = 'docco.scss';
var docco_sass_pattern = path.join(src_dir, docco_sass_filename);


gulp.task('docco:sass', function() {
	return gulp.src( path.join(src_dir, docco_sass_filename) )
		.pipe(sass({
			// indentedSyntax: true,
			errLogToConsole: true
		}))
		.pipe(
			gulp.dest( path.join(docs_dir) )
		);
});

gulp.task('docco:rm-fonts', function(cb) {
	var p = path.join(docs_dir, 'public', 'fonts');
	rimraf(p, cb);
});

gulp.task('docco:clean', function(cb) {
	rimraf(docs_dir, cb);
});

gulp.task('docco:docco', function() {
	return gulp.src(docs_file_pattern)
		.pipe(changed(docs_dir)) // incremental build
		.pipe(docco({
			// css: 'path/to/custom/docco.css'
		}))
		.pipe(gulp.dest(docs_dir));
});

gulp.task('docco', function(cb) {
	gulpSequence('docco:clean', 'docco:docco', ['docco:sass', 'docco:rm-fonts'], cb);
});


gulp.task('mocha', function() {
	return gulp.src(test_file_pattern, { read: false })
		.pipe(mocha())
		.on('error', function(err) {
			notifier.notify({
				title: err.plugin,
				message: err.message
			});
		});
});


gulp.task('webpack', function() {
	return gulp.src(main_filepath)
		.pipe(webpack({
			watch: true,
			output: {
				// library: name // standalone
			}
		}))
		.pipe(rename({
			basename: name
		}))
		.pipe(gulp.dest(output_dir));
});


gulp.task('watch', function() {
	// gulp.watch([source_file_pattern, test_file_pattern], ['mocha']);
	gulp.watch(source_file_pattern, ['docco']);
	gulp.watch(docco_sass_pattern, ['docco:sass']);
});


gulp.task('default', ['watch', 'webpack', 'docco']);
