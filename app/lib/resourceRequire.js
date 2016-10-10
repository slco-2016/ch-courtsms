module.exports = function(category, name) {
  fileName = name.charAt(0).toLowerCase() + name.slice(1);
  return require(`${__dirname}/../${category}/${fileName}`);
};