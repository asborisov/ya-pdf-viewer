var gulp = require('gulp');
var jshint = require('gulp-jshint');
var concat = require('gulp-concat');
var uglify = require('gulp-uglify');
// web server
var webserver = require('gulp-webserver');
// Compile scss
var sass = require('gulp-sass');
// Autoprefix CSS3
var autoprefixer = require('gulp-autoprefixer');

gulp.task('default', ['style'], function() {
	return gulp.src(['src/yaPdf.js', 'src/services/*.js', 'src/ya*.js'])
		.pipe(jshint())
		.pipe(concat('ya-pdf.js'))
		// .pipe(uglify())
		.pipe(gulp.dest('dist'));
});

gulp.task('style', function() {
	return gulp.src(['src/styles/*.scss'])
		.pipe(sass())
		.pipe(autoprefixer())
		.pipe(gulp.dest('dist'));
});

gulp.task('dev', ['demo'], function () {
	gulp.watch(['src/**/*.*'], ['default']);
});

gulp.task('demo', ['default'], function() {
	return gulp.src('')
        .pipe(webserver({
        	directoryListing: true,
            path: '/',
            port: 3000
        }));
});
