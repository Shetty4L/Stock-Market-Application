var gulp = require('gulp'),
    gutil = require('gulp-util'),
    jshint = require('gulp-jshint'),
    uglify = require('gulp-uglify'),
    concat = require('gulp-concat'),
    cleanCss = require('gulp-clean-css'),
    pump = require('pump'),
    browserSync = require('browser-sync').create(),
    inject = require('gulp-inject'),
    bowerFiles = require('main-bower-files'),
    es = require('event-stream'),
    nodemon = require('gulp-nodemon'),
    series = require('stream-series'),
    rename = require('gulp-rename'),
    del = require('del'),
    exec = require('child_process').exec,
    copy = require('gulp-copy');

gulp.task('default', ['serve'], function() {
  return gutil.log('Gulp is running properly');
});

gulp.task('jshint', function() {
  return gulp.src('src/scripts/**/*.js')
    .pipe(jshint())
    .pipe(jshint.reporter('jshint-stylish'));
});

gulp.task('uglify', ['concat-js'], function(cb) {
  pump([
      gulp.src('dist/scripts/scripts.js'),
      uglify({mangle:false}),
      rename({suffix: '.min'}),
      gulp.dest('dist/scripts')
    ], cb);
});

gulp.task('minify-css', ['concat-css'], function(cb) {
  pump([
    gulp.src('dist/styles/styles.css'),
    cleanCss({debug: true}, function(details) {
        console.log(details.name + ': ' + details.stats.originalSize);
        console.log(details.name + ': ' + details.stats.minifiedSize);
      }),
    rename({suffix: '.min'}),
    gulp.dest('dist/styles')
  ], cb);
});

gulp.task('concat-css', function() {
  var src = ['src/styles/reset/reset.css'];
  var regex = /.*\.css/;
  bowerFiles().forEach(function(filename) {
    if(regex.test(filename)) src.push(filename);
  });
  src.push('src/styles/*.css');
  return gulp.src(src)
    .pipe(concat('styles.css'))
    .pipe(gulp.dest('dist/styles'));
});

gulp.task('concat-js', function() {
  var src = [];
  var regex = /.*\.js/;
  bowerFiles().forEach(function(filename) {
    if(regex.test(filename)) src.push(filename);
  });
  src.push('src/scripts/*.js');
  return gulp.src(src)
    .pipe(concat('scripts.js'))
    .pipe(gulp.dest('dist/scripts'));
})

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

gulp.task('copy', function() {
  gulp.src('src/views/*.html')
    .pipe(gulp.dest('dist/views'));
});

gulp.task('serve:dist', ['copy', 'inject:dist'], function() {
  console.log('Serving production server');
  exec('node dist/app.js', function (err, stdout, stderr) {
    console.log(stdout);
    console.log(stderr);
    cb(err);
  });
});

gulp.task('inject', function() {
  var reset = gulp.src('src/styles/reset/reset.css', {read: false});
  var bower = gulp.src(bowerFiles(), {read: false});
  var others = gulp.src([
      './src/scripts/**/*.js',
      './src/styles/*.css'
    ], {read:false});

  gulp.src('./src/views/index.html')
    .pipe(inject(series(reset, bower, others), {relative:true, ignoreFilePath: 'bower_components'}))
    .pipe(gulp.dest('./src/views'));
});

gulp.task('inject:dist', ['uglify', 'minify-css'], function() {
  del(['dist/scripts/scripts.js','dist/styles/styles.css']);

  gulp.src('./dist/views/index.html')
    .pipe(inject(gulp.src(['dist/styles/*.min.css','dist/scripts/*.min.js']), {relative:true}))
    .pipe(gulp.dest('./dist/views'));
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
