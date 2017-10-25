var gulp = require('gulp'),
    gutil = require('gulp-util'),
    jshint = require('gulp-jshint'),
    uglify = require('gulp-uglify'),
    cleanCss = require('gulp-clean-css'),
    pump = require('pump'),
    browserSync = require('browser-sync').create(),
    inject = require('gulp-inject'),
    bowerFiles = require('main-bower-files'),
    es = require('event-stream'),
    mocha = require('gulp-mocha'),
    nodemon = require('gulp-nodemon'),
    series = require('stream-series');

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

gulp.task('watch', ['nodemon'], function() {
  gulp.watch('src/**/*.*', ['jshint', 'inject', browserSync.reload]);
});

gulp.task('serve', ['jshint', 'inject', 'watch'], function() {
  console.log('Serving development server');
  browserSync.init({
    proxy: 'http://localhost:3000',
    port: 8080
  });
});

gulp.task('serve:dist', ['jshint', 'uglify', 'minify-css'], function() {
  browserSync.init({
    server: {
      baseDir: 'dist'
    }
  });
});

gulp.task('inject', function() {
  var reset = gulp.src('src/styles/reset.css', {read: false});
  var bower = gulp.src(bowerFiles(), {read: false});
  var others = gulp.src([
      './src/scripts/**/*.js',
      '!src/styles/reset.css',
      './src/styles/**/*.css'
    ], {read:false});

  gulp.src('./src/views/index.html')
  .pipe(inject(series(reset, bower, others), {relative:true, ignoreFilePath: 'bower_components'}))
  .pipe(gulp.dest('./src/views'));
});

gulp.task('nodemon', function (cb) {
    var callbackCalled = false;
    return nodemon({
      script: 'src/app.js',
      env: {
        'NODE_ENV': 'development'
      }
    }).on('start', function () {
        if (!callbackCalled) {
          cb();
          callbackCalled = true;
        }
    });
});
