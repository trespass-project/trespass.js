var gulp = require('gulp');
var webpack = require('gulp-webpack');
var rename = require('gulp-rename');
var mocha = require('gulp-mocha');
var notifier = require('node-notifier');
var path = require('path');

var name = 'trespass';
var src_dir = 'src';
var output_dir = 'dist';
var main_filename = 'index.js';
var main_filepath = path.join(src_dir, main_filename);
var source_file_pattern = path.join(src_dir, '**/*.js');
var test_dir = 'test';
var test_file_pattern = path.join(test_dir, '*.js');


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
				library: name
			}
		}))
		.pipe(rename({
			basename: name
		}))
		.pipe(gulp.dest(output_dir));
});


gulp.task('default', ['mocha', 'webpack'], function() {
	gulp.watch([source_file_pattern], ['mocha']);
});
