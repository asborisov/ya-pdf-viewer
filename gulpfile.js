var gulp = require('gulp');
// Validate JS
var jshint = require('gulp-jshint');
// web server
var webserver = require('gulp-webserver');
// Compile scss
var sass = require('gulp-sass');
// Autoprefix CSS3
var autoprefixer = require('gulp-autoprefixer');
// Babel
var babel = require('gulp-babel');
// WebPack
var webpack = require('webpack');
// Stream version of WebPack
var webpackStrem = require('webpack-stream');

gulp.task('default', ['style'], function() {
	return gulp.src(['src/yaPdf.js', 'src/services/*.js', 'src/directives/*.js'])
		.pipe(jshint())
    .pipe(webpackStrem({
			output: {
				filename: 'ya-pdf.js',
				publicPath: '/assets/'
			},
			devtool: 'source-map',
			plugins: [
		    new webpack.optimize.UglifyJsPlugin({
		      sourceMap: false,
		      mangle: ['angular'],
					unused: true,
					compress: {
						warnings: false
					}
		    })
		  ],
  		module: {
				loaders: [
					{
						test: /\.jsx?$/,
						exclude: /(node_modules|bower_components)/,
						loader: 'babel', // 'babel-loader' is also a legal name to reference
						query: {
							presets: ['es2015-webpack']
						}
					}
				]
			}
  	}))
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

gulp.task('dev', ['demo'], function() {
	gulp.watch(['src/**/*.js'], ['default']);
});
