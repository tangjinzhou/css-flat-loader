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
                // loader: "style-loader!css-flat-loader!css-loader?modules!less-loader",
                loader: ExtractTextPlugin.extract("css-flat-loader!css?modules&localIdentName=_[local]_!less"),
            },
        ]
    },
    plugins: [
        new ExtractTextPlugin("[name].css", {
            allChunks: true,
            disable: false
        }),
        new webpack.optimize.UglifyJsPlugin({
            compress: { warnings: false }
        })
    ]
};
