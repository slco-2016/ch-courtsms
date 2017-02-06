

const gulp = require('gulp');
const sass = require('gulp-sass');

// Compile all SASS into CSS and place in Public folder under CSS
gulp.task('sass', () => {
  gulp.src('./gulp/sass/**/*.scss')
    .pipe(sass().on('error', sass.logError))
    .pipe(gulp.dest('./public/css'));
});

// Tell Gulp to watch the sass folder for changes
gulp.task('sass:watch', () => {
  gulp.watch('./gulp/sass/**/*.scss', ['sass']);
});
