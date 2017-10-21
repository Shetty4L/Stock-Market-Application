var gulp = require('gulp'),
    gutil = require('gulp-util'),
    jshint = require('gulp-jshint'),
    uglify = require('gulp-uglify'),
    cleanCss = require('gulp-clean-css'),
    pump = require('pump'),
    browserSync = require('browser-sync'),
    inject = require('gulp-inject'),
    bowerFiles = require('main-bower-files'),
    es = require('event-stream'),
    mocha = require('gulp-mocha');

gulp.task('default', ['serve'], function() {
  return gutil.log('Gulp is running properly');
});

gulp.task('jshint', function() {
  return gulp.src('src/scripts/**/*.js')
    .pipe(jshint())
    .pipe(jshint.reporter('jshint-stylish'));
});

gulp.task('uglify', function(cb) {
  pump([
      gulp.src('src/scripts/**/*.js'),
      uglify(),
      gulp.dest('dist/scripts')
    ], cb);
});

gulp.task('minify-css', function(cb) {
  pump([
    gulp.src('src/styles/**/*.css'),
    cleanCss({debug: true}, function(details) {
        console.log(details.name + ': ' + details.stats.originalSize);
        console.log(details.name + ': ' + details.stats.minifiedSize);
      }),
      gulp.dest('dist/styles')
  ], cb);
});

gulp.task('serve', ['jshint', 'inject'], function() {
  browserSync({
    server: {
      baseDir: ['src', '.tmp', 'bower_components']
    }
  });
  gulp.watch('src/scripts/**/*.js', browserSync.reload);
  gulp.watch('src/styles/**/*.css', browserSync.reload);
  gulp.watch('src/*.html', browserSync.reload);
});

gulp.task('serve:dist', ['jshint', 'uglify', 'minify-css'], function() {
  browserSync({
    server: {
      baseDir: 'dist'
    }
  });
});

gulp.task('inject', function() {
  gulp.src('./src/index.html')
  .pipe(inject(gulp.src(bowerFiles(), {read: false}),
    {
      name:'bower',
      ignorePath: 'bower_components'
    }
  ))
  .pipe(inject(gulp.src([
      './src/scripts/**/*.js',
      './src/styles/**/*.css'
    ], {read:false}), {relative: true}))
  .pipe(gulp.dest('./src'));
});
