'use strict';

const base = {
  src: './src',
  dest: './dest'
};

const paths = {
  views: {
    src: [`${base.src}/views/**/*.pug`, `${base.src}/components/**/*.pug`],
    build: [`${base.src}/views/**/*.pug`, `!${base.src}/views/layout/*.pug`],
    dest: base.dest
  },
  images: {
    src: `${base.src}/assets/images/**/*.{gif,jpg,png,svg}`,
    dest: `${base.dest}/assets/images`
  },
  styles: {
    src: [`${base.src}/assets/styles/**/*.scss`, `${base.src}/components/**/*.scss`],
    build: `${base.src}/assets/styles/app.scss`,
    dest: `${base.dest}/assets/styles`
  },
  scripts: {
    src: [`${base.src}/assets/scripts/**/*.js`, `${base.src}/components/**/*.js`],
    build: `${base.src}/assets/scripts/app.js`,
    dest: `${base.dest}/assets/scripts`
  }
};

const gulp = require('gulp');
const browserSync = require('browser-sync').create();
const $ = require('gulp-load-plugins')({
  pattern: '*',
  replaceString: /^gulp(-|\.)|^postcss-/
});

const isProduction = process.env.NODE_ENV === 'production';

function handleError() {
  return $.plumber({
    errorHandler: $.notify.onError((error) => {
      return {
        title: 'Error: ' + error.plugin,
        message: error.message
      };
    })
  });
}

gulp.task('clean', () => {
  return $.del(base.dest);
});

gulp.task('views:lint', () => {
  return gulp.src(paths.views.src)
    .pipe(handleError())
    .pipe($.pugLint())
});

gulp.task('views:build', () => {
  return gulp.src(paths.views.build)
    .pipe(handleError())
    .pipe($.data((file) => require(`${base.src}/data/data.json`) ))
    .pipe($.pug({ pretty: true }))
    .pipe(gulp.dest(paths.views.dest));
});

gulp.task('views', gulp.series('views:lint', 'views:build'));

gulp.task('images', () => {
  return gulp.src(paths.images.src, { since: gulp.lastRun('images') })
    .pipe(handleError())
    .pipe($.if(isProduction, $.imagemin()))
    .pipe(gulp.dest(paths.images.dest));
});

gulp.task('styles', () => {
  return gulp.src(paths.styles.build)
    .pipe(handleError())
    .pipe($.if(!isProduction, $.sourcemaps.init({ loadMaps: true })))
    .pipe($.postcss([
      $.stylelint(),
      $.reporter({ clearMessages: true, throwError: true })
    ], { syntax: $.scss }))
    .pipe($.sass({
      includePaths: [
        'node_modules/node-normalize-scss',
        'node_modules/sass-mq'
      ],
      outputStyle: 'expanded'
    }))
    .pipe($.postcss([
      $.pxtorem(),
      $.assets({ basePath: base.src, loadPaths: ['assets/images/'] }),
      $.cssMqpacker(),
      $.sorting(),
      $.autoprefixer({ browsers: ['last 2 versions'] }),
      $.cssnano()
    ]))
    .pipe($.rename( {suffix: '.min'} ))
    .pipe($.if(!isProduction, $.sourcemaps.write()))
    .pipe(gulp.dest(paths.styles.dest));
});

gulp.task('scripts:lint', () => {
  return gulp.src(paths.scripts.src)
    .pipe(handleError())
    .pipe($.eslint())
    .pipe($.eslint.format())
    .pipe($.eslint.failAfterError());
});

gulp.task('scripts:bundle', () => {
  const bundler = $.watchify(
    $.browserify(paths.scripts.build, {
      cache: {},
      packageCache: {}
    })
    .transform($.babelify)
  );

  function handleBundleError(error) {
    const args = Array.prototype.slice.call(arguments);
    $.notify.onError({
      title: 'Error: browserify',
      message: error.message
    }).apply(this, args);
    this.emit('end');
  }

  function bundle() {
    return bundler.bundle()
      .on('error', handleBundleError)
      .pipe($.vinylSourceStream('app.js'))
      .pipe($.vinylBuffer())
      .pipe($.if(!isProduction, $.sourcemaps.init({ loadMaps: true })))
      .pipe($.if(isProduction, $.uglify()))
      .pipe($.rename( {suffix: '.min'} ))
      .pipe($.if(!isProduction, $.sourcemaps.write()))
      .pipe(gulp.dest(paths.scripts.dest));
  }

  bundler.on('update', gulp.series('scripts:lint', bundle));

  return bundle();
});

gulp.task('scripts', gulp.series('scripts:lint', 'scripts:bundle'));

gulp.task('watch', () => {
  gulp.watch(paths.views.src, gulp.series('views'));
  gulp.watch(paths.images.src, gulp.series('images'));
  gulp.watch(paths.styles.src, gulp.series('styles'));
});

gulp.task('serve', () => {
  browserSync.init({ server: base.dest });
  browserSync.watch(`${base.dest}/**/*.*`).on('change', browserSync.reload);
});

gulp.task('build', gulp.series(
  'clean',
  gulp.parallel('views', 'images', 'styles', 'scripts')
));

gulp.task('default',
  gulp.series('build', gulp.parallel('serve', 'watch'))
);
