var gulp = require('gulp');

var clean = require('gulp-clean');
var concat = require('gulp-concat');
var uglify = require('gulp-uglify');
var filesize = require('gulp-filesize');
var gutil = require('gulp-util');
var sourcemaps = require('gulp-sourcemaps');
var watch = require('gulp-watch');
var rename = require('gulp-rename');
var jsdoc = require('gulp-jsdoc');

gulp.task('clean', function() {
    return gulp.src('release', {read: false}).pipe(clean());
});

gulp.task('build', function() {
    return gulp.src('framework/**.js')
        .pipe(concat('pathfinder.js'))
        .pipe(gulp.dest('release'))
        .pipe(uglify())
        .pipe(rename('pathfinder.min.js'))
        .pipe(sourcemaps.write())
        .pipe(gulp.dest('release'))
        .pipe(filesize())
        .on('error', gutil.log);
});

gulp.task('docs', function() {
    return gulp.src('./framework/**.js')
        .pipe(jsdoc('release/docs'));
});

gulp.task('watch', function() {
    gulp.watch('framework/**.js', ['clean', 'build', 'docs']);
});

gulp.task('default', ['watch', 'clean', 'build', 'docs']);
