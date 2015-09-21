var gulp = require('gulp');
var jshint = require('gulp-jshint');
var concat = require('gulp-concat');
var uglify = require('gulp-uglify');

gulp.task('default', function () {
	gulp.src(['src/delegate-service.js', 'src/yaPdf.js', 'src/ya*.js'])
		.pipe(jshint())
		.pipe(concat('ya-pdf.js'))
		.pipe(uglify())
		.pipe(gulp.dest('dist'));
});