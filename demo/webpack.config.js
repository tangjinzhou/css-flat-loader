var webpack = require('webpack');
var ExtractTextPlugin = require('extract-text-webpack-plugin');
var OptimizeCssAssetsPlugin = require('optimize-css-assets-webpack-plugin');

module.exports = {
    entry: __dirname + '/index.js',
    output: {
        publicPath: '/',
        filename: './bundle.js'
    },
    module: {
        loaders: [
            {
                test: /\.jsx?$/,
                exclude: /node_modules/,
                loader: 'babel',
                query: {
                    presets: ['es2015', 'stage-0', 'react']
                }
            },
            {
                test: /\.less$/,
                loader: "style-loader!css-flat-loader!css-loader?modules&localIdentName=[path][name]---[local]---[hash:base64:5]&sourceMap!less-loader?sourceMap",
                //loader: ExtractTextPlugin.extract("css-flat!css?modules&localIdentName=_[local]_&sourceMap!less?sourceMap"),
            },
        ]
    },
    plugins: [
        new ExtractTextPlugin("[name].css", {
            allChunks: true,
        }),
        new OptimizeCssAssetsPlugin(),
    ]
};
