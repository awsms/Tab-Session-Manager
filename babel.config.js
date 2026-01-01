module.exports = {
  presets: [
    [
      "@babel/preset-env",
      {
        targets: {
          firefox: 57
        }
      }
    ],
    "@babel/preset-react"
  ],
  plugins: [
    "@babel/plugin-transform-optional-chaining",
    "@babel/plugin-transform-object-rest-spread",
    "@babel/plugin-transform-class-properties"
  ]
};
