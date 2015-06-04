var _ = require('lodash');
var gulp = require('gulp');
var rename = require('gulp-rename');
var mocha = require('gulp-mocha');
var notifier = require('node-notifier');
var path = require('path');
var rimraf = require('rimraf');
var docco = require('gulp-docco');
var sass = require('gulp-sass');
var gulpSequence = require('gulp-sequence');
var changed = require('gulp-changed');
var watchify = require('watchify');
var browserify = require('browserify');
var gutil = require('gulp-util');
var source = require('vinyl-source-stream');

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


var main_js = './src/trespass.js';
var out_dir = './dist';
var out_filename = 'trespass.js';
// build scripts with browserify
gulp.task('build:scripts', function() {
	return browserify({
			// standalone: standalone,
			// transform: [reactify]
		})
		.add(main_js)
		.bundle()
		.on('error', function(e) {
			gutil.log('Browserify Error', e);
		})
		.pipe(source(out_filename))
		.pipe(gulp.dest(out_dir));
});

// watch scripts & build with debug features
gulp.task('watch:scripts', function() {
	var b = browserify(
			_.defaults({
				// standalone: standalone,
				// transform: [reactify]
			}, watchify.args)
		)
		.add(main_js);

	var w = watchify(b)
		.on('update', function(scriptIds) {
			scriptIds = scriptIds
				.filter(function(i) { return i.substr(0,2) !== './'; })
				.map(function(i) { return chalk.blue(i.replace(__dirname, '')); });
			if (scriptIds.length > 1) {
				gutil.log(scriptIds.length + ' Scripts updated:\n* ' + scriptIds.join('\n* ') + '\nrebuilding...');
			} else {
				gutil.log(scriptIds[0] + ' updated, rebuilding...');
			}

			rebundle();
		})
		.on('time', function(time) {
			gutil.log(chalk.green('Scripts built in ' + (Math.round(time / 10) / 100) + 's'));
		});

	function rebundle() {
		w.bundle()
			.on('error', function(e) {
				gutil.log('Browserify Error', e);
			})
			.pipe(source(out_filename))
			.pipe(gulp.dest(out_dir));
	}

	return rebundle();
});


gulp.task('watch', function() {
	// gulp.watch([source_file_pattern, test_file_pattern], ['mocha']);
	gulp.watch(source_file_pattern, ['docco']);
	gulp.watch(docco_sass_pattern, ['docco:sass']);
});


gulp.task('default', ['watch', 'watch:scripts', 'docco']);
