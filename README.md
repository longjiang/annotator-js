# Annotator.js

A JavaScript library that puts pinyin on top of Chinese text.

It uses the web service `https://mand.chinesezerotohero.com/api/multitextjsonv2` which I created. (Note the request only words over secured `https`.)

## Demo

See the <a href="https://longjiang.github.io/annotator-js/index.html">annotation in action</a>.

## Usage

First, make sure to include the *non-slim* version of jQuery 3.3.1 on your HTML page:

```html
<script src="https://code.jquery.com/jquery-3.3.1.min.js"></script>
```

Then, include *all* css and js included in this package.

```html
<link rel="stylesheet" href="css/tipped.css">
<link rel="stylesheet" href="css/annotator.css">
```

```html
<script src="js/tipped.js"></script><!-- For popup tooltips that shows definitions. -->
<script src="js/annotator.js"></script>
```

Any element with the class "add-pinyin" will be automatically annotated and styled:

```html
<div class="add-pinyin">学而不思则惘</div>
```

Also works with inline elements:

```html
<p>Chinese people like eating <span class="add-pinyin">饺子</span> and drinking <span class="add-pinyin">热水</span>.</p>
```

## Custom elements

If you want to annotate a different selector, do this:

```html
<div id="#custom" class="add-pinyin">学而不思则惘</div>
```

```javascript
var annotator = new Annotator();  
annotator.annotateBySelector('#custom, #custom *")
```

