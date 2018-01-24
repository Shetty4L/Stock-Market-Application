# Stock Market Application

A MEAN web application that provides real-time stock market information for all companies registered with the New York Stock Exchange (NYSE) and the NASDAQ. The live hosted version can be found [here](http://isydfq.us-west-1.elasticbeanstalk.com).

## Getting Started
These instructions will get you a working copy of the project for development purposes.

### Prerequisites
- Gulp
- Node/NPM
- Bower

### Installing
After cloning this repository, navigate to the root of the repository and do the following:

```
    npm install
    bower install
```
This should install all the node packages and frontend dependencies.

### Development
To test application, run
```
    gulp serve
```
This will whip up a NodeJS server on port 3000 which will then be forwarded to port 8080 by BrowserSync to allow automatic refresh of the browser when any of the frontend files are modified and saved.

## Deployment
Run
```
    gulp serve:dist
```
This will instantiate a production server while minifying all javascript files, concatenating all CSS files. The production server will run on port 3000.

## License
This project is licensed under the MIT License - see the LICENSE.md file for details

## Acknowledgements
Special thanks to the University of Southern California and Professor Marco Papa for teaching the wonderful CSCI 571 - Web Technologies course. 
