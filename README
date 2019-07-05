# Annotator.js

A JavaScript library that puts pinyin on top of Chinese text.

It uses the web service `http://mand.chinesezerotohero.com/api/multitextjsonv2` which I created.

I've coded a JavaScript+CSS library that can annotate text into pinyin. 

## Usage

First, include *all* css and js included in this package on your HTML page. Any element with the class "add-pinyin" will be automatically annotated and styled:

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

