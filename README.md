# SMX template for JSDoc 3

- [SMX](https://github.com/canvasplay/SMX)
- [SMX API Documentation](http://canvasplay.github.io/SMX/)

## Installation

Install the template using NPM:

```bash
npm install smx-jsdoc-template --save-dev
```

## Usage

If you already have JSDoc system, you can use this project as JSDoc template. More information about JSDoc command-line arguments can be found [here](http://usejsdoc.org/about-commandline.html).
 
```bash
jsdoc -c conf.json -R README.md
```

### conf.json

You can set options for customizing your documentations. Notice the `"template"` field for setting the path to **smx-jsdoc-template**.

```json
"templates": {
    "applicationName": "Demo",
    "disqus": "",
    "googleAnalytics": "",
    "openGraph": {
        "title": "",
        "type": "website",
        "image": "",
        "site_name": "",
        "url": ""
    },
    "meta": {
        "title": "",
        "description": "",
        "keyword": ""
    },
    "linenums": true,
    "source": {
        "include": [
            "./src/"
        ],
        "includePattern": ".+\\.js(doc)?$",
        "excludePattern": "(^|\\/|\\\\)_"
    },
    "opts": {
        "encoding": "utf8",
        "recurse": true,
        "private": false,
        "lenient": true,
        "destination": "./docs",
        "template": "./node_modules/smx-jsdoc-template"
    }
}
```

## License

This project under the MIT License. and this project refered by default template for JSDoc 3.