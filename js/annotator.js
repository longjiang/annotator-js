/**
 * Annotator.js
 *
 * 2019-07-04
 *
 * Usage: Any div with class "add-pinyin" will be automatically annotated if you include this script.
 * Requires: Tipped.js
 */

class Annotator {
  selector; // .add-pinyin by default

  // server = "//mand.chinesezerotohero.com";
  server = "//mand.local:8888";

  dictionaries = {
    cedict: {
      locale: "en",
      resourceUrl: this.server + "/api/multitextjsonv2",
      addWeightUrl: this.server + "/weight/addweight?wordid=",
      dictUrl: "//www.mdbg.net/chindict/chindict.php?wdqb=",
      editUrl:
        "//cc-cedict.org/editor/editor.php?handler=InsertSimpleEntry&insertsimpleentry_old_cedict=",
      addUrl:
        "//cc-cedict.org/editor/editor.php?return=&popup=0&handler=InsertQueueEntry&insertqueueentry_diff=%2B+", // &#43; is the plus sign
      tEdit: "Edit",
      tAdd: "Add",
      tUseThis: "Use This",
      tShow: "Show the Editor",
      tHide: "Hide the Editor",
      tSpeak: "Speak",
      tMerge: "Merge Right",
      tPause: "Pause",
      annotationLines: [
        "definition",
        "pinyin",
        "mand",
        "simplified",
        "traditional"
      ],
      primaryLine: "simplified",
      tooltipHeading: "pinyin",
      tooltipDefinition: "definition",
      addSpace: true, // Whether to add spaces before word blocks (only Chinese should set this to true)
      annotatablePattern: /[\u2E80-\u2E99\u2E9B-\u2EF3\u2F00-\u2FD5\u3005\u3007\u3021-\u3029\u3038-\u303B‌​\u3400-\u4DB5\u4E00-\u9FCC\uF900-\uFA6D\uFA70-\uFAD9]+/g
    },
    ckdict: {
      locale: "ko_KR",
      resourceUrl: "//mand.chinesezerotohero.com/api/multicktextjson",
      addWeightUrl: this.server + "/weight/addweightck?wordid=",
      dictUrl: "//dic.daum.net/search.do?q=",
      editUrl: null,
      tEdit: "변집",
      tAdd: "추가",
      tUseThis: "이발음으로 선택",
      tShow: "변집함을 열기",
      tHide: "변집함을 닫기",
      tSpeak: "말하기",
      tMerge: "다음 단어와 함께",
      tPause: "정지",
      tooltipHeading: "pinyin",
      tooltipDefinition: "definition",
      annotationLines: [
        "definition",
        "pinyin",
        "mand",
        "simplified",
        "traditional"
      ],
      primaryLine: "simplified",
      addSpace: true, // Whether to add spaces before word blocks (only Chinese should set this to true)
      annotatablePattern: /[\u2E80-\u2E99\u2E9B-\u2EF3\u2F00-\u2FD5\u3005\u3007\u3021-\u3029\u3038-\u303B‌​\u3400-\u4DB5\u4E00-\u9FCC\uF900-\uFA6D\uFA70-\uFAD9]+/g
    },
    kcdict: {
      locale: "ko_KR",
      resourceUrl: this.server + "/api/multikctextjson",
      addWeightUrl: this.server + "/weight/addweightkc?wordid=",
      dictUrl: "//dic.daum.net/search.do?q=",
      editUrl: null,
      tEdit: "변집",
      tAdd: "추가",
      tUseThis: "이발음으로 선택",
      tShow: "변기함을 열기",
      tHide: "변기함을 닫기",
      tSpeak: "말 하기",
      annotationLines: [
        "pinyin",
        "simplified",
        "roman",
        "dictionary_form",
        "hangul"
      ],
      primaryLine: "hangul",
      tooltipHeading: "dictionary_form",
      tooltipDefinition: "simplified",
      // Generated by //apps.timwhitlock.info/js/regex
      annotatablePattern: /[ᄀ-\u11fe\u3130-ㆎ\ua960-\ua97e가-\ud7ae\ud7b0-\ud7fe]+/g
    }
  };

  jsonData = [];

  numCharsInThisRequest = 0;

  nodesToAnnotate = [];

  totalRequests = 0;

  maxNumCharsPerRequest = 700; // 100 characters per batch

  seenNodes = [];

  wordBefore = "";

  mandBlockID = 0;

  batches = []; // Batches needs to be done

  doneBatches = []; // Batches that are done

  constructor(activeDictionary = "cedict") {
    var annotator = this;

    annotator.dictionary = annotator.dictionaries[activeDictionary];

    annotator.annotationLines = annotator.dictionary.annotationLines;

    annotator.primaryLine = annotator.dictionary.primaryLine;

    annotator.timeout = annotator.maxNumCharsPerRequest * 0;

    annotator.attachEventHandlers();
  }

  setThis(button, defIndex) {
    var annotator = this;
    var $button = $(button);
    var $mandBlock = $('[data-id="' + annotator.mandBlockID + '"]'); // The jQuery Object
    var mandBlock = $mandBlock.get(0); // The node
    var dictionary = annotator.dictionary;
    for (i in dictionary.annotationLines) {
      line = dictionary.annotationLines[i];
      $mandBlock
        .find(".mand-block-" + line)
        .text($mandBlock.attr("data-" + line + "-" + defIndex));
    }
    $mandBlock.attr("data-preferred-def-index", defIndex);
    var wordId = $mandBlock.attr("data-id-" + defIndex);
    Tipped.remove(mandBlock);
    Tipped.create(mandBlock, annotator.tooltipTemplate, {
      position: "bottomleft",
      maxWidth: 400,
      minWith: 200
    });
    var jqxhr = $.ajax(dictionary.addWeightUrl + wordId).done(function() {
      $button.addClass("done");
    });
    return false;
  }

  mergeWithNext(button) {
    var annotator = this;
    var $block = $('[data-id="' + annotator.mandBlockID + '"]');
    var $nextBlock = $block.next();
    if ($nextBlock.is(".mand-block")) {
      nextBlockChildren = $nextBlock.children();
      children = $block.children();
      for (var i = 0; i < children.length; i++) {
        $span = $(children[i]);
        $span.text($span.text() + $(nextBlockChildren[i]).text());
        maxWidthString =
          $span.css("max-width").replace("px", "") * 1 +
          $(nextBlockChildren[i])
            .css("max-width")
            .replace("px", "") *
            1 +
          "px";
        $span.css("max-width", maxWidthString);
      }
      $nextBlock.remove();
    }
  }

  speak(text) {
    var annotator = this;
    window.speechSynthesis.cancel();
    var utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "zh-CN";
    window.speechSynthesis.speak(utterance);
    utterance.onend = function() {
      $("#annotator-speak-button").html(
        '<i class="glyphicon-volume-up glyphicon"></i>' +
          annotator.dictionary.tSpeak
      );
    };
  }

  tooltipTemplate() {
    var annotator = this;
    return function() {
      var dictionary = annotator.dictionary;
      var element = $(this);
      var i = 0;
      var html = "";
      var indices = [];
      while (element.is("[data-" + dictionary.primaryLine + "-" + i + "]")) {
        // If the user already set a preferred definition, show that one first always.
        if (element.attr("data-preferred-def-index") == i) {
          indices.unshift(i);
        } else {
          indices.push(i);
        }
        i++;
      }
      for (var index = 0; index < indices.length; index++) {
        i = indices[index];
        var text = element.text();
        html += '<div class="mand-def">';
        if (index == 0) {
          html +=
            '<a href="#" onClick="annotator.speak(\'' +
            $(this).attr("data-simplified-" + i) +
            '\');  return false" data-id="' +
            $(this).attr("data-id-" + i) +
            '" class="btn speak glyphicon glyphicon-volume-up"></a>';
        }
        html += '<h2><a target="_blank" href="' + dictionary.dictUrl;
        html += $(this).attr("data-" + dictionary.primaryLine + "-" + i) + '">';
        html += $(this).attr("data-" + dictionary.tooltipHeading + "-" + i);
        html += "</a></h2>";
        // If we have at least 2 definitions, or 'set this' button won't be helpful
        if (index > 0) {
          html += '<a href="#" ';
          html +=
            'onClick="annotator.setThis(this, ' +
            i +
            ", '" +
            $(this).attr("data-id") +
            "');  return false\" ";
          html +=
            'data-id="' +
            $(this).attr("data-id-" + i) +
            '" class="btn set-this">';
          html += dictionary.tUseThis + "</a>";
        }
        if (index == 0) {
          html += '<a href="#" ';
          html +=
            "onClick=\"annotator.mergeWithNext(this, '" +
            $(this).attr("data-id") +
            "');  return false\" ";
          html += 'class="btn set-this">';
          html += dictionary.tMerge + "</a>";
        }
        if (dictionary.editUrl != null) {
          html += '<a href="' + dictionary.editUrl;
          html += $(this).attr("data-traditional-" + i) + " ";
          html += $(this).attr("data-simplified-" + i) + " ";
          html += "%5B"; // '%5B' is [
          html += $(this).attr("data-pinyincedict-" + i);
          html += "%5D"; // '%5D' is ]
          html += "%2F" + $(this).attr("data-definitioncedict-" + i) + "%2F"; // %2F is forward slash /
          html += '" target="_blank" class="btn def-edit">';
          html += dictionary.tEdit;
          // html += ' “' + $(this).attr('data-simplified-' + i) + '”';
          html += "</a>";
        }
        var $next = $(this).next();
        if (index == 0 && $next.is(".mand-block")) {
          if (dictionary.addUrl != null && annotator.tinyMCE) {
            comment = tinyMCE.activeEditor.getContent({ format: "text" });
            html += '<a href="' + dictionary.addUrl;
            html +=
              $(this).attr("data-traditional-0") +
              $next.attr("data-traditional-0") +
              " ";
            html +=
              $(this).attr("data-simplified-0") +
              $next.attr("data-simplified-0") +
              " ";
            html += "%5B"; // '%5B' is [
            html +=
              $(this).attr("data-pinyincedict-0") +
              " " +
              $next.attr("data-pinyincedict-0");
            html += "%5D "; // '%5D' is ]
            html += "%2F" + $(this).attr("data-definitioncedict-0"); // %2F is forward slash /
            html += "%2F" + $next.attr("data-definitioncedict-0") + "%2F"; // %2F is forward slash /
            html += "&insertqueueentry_comment=" + comment.substring(0, 100); // Some comments are too long and cannot be passed as url
            html += '" target="_blank" class="btn def-edit">';
            html +=
              dictionary.tAdd +
              " “" +
              $(this).attr("data-simplified-0") +
              $next.attr("data-simplified-0") +
              "”</a>";
          }
        }
        html +=
          "<p>" +
          $(this).attr("data-" + dictionary.tooltipDefinition + "-" + i) +
          "</p></div>";
        i++;
      }
      return html;
    };
  }

  map(collection, callback) {
    var i;
    var mapped = [];
    for (i = 0; i < collection.length; i++) {
      mapped.push(callback(collection[i]));
    }
    return mapped;
  }
  /**
   * Add tooltips with the jQuery UI Tooltip component.
   */

  addTooltips() {
    var annotator = this;
    Tipped.create(".mand-block", annotator.tooltipTemplate(), {
      position: "bottomleft",
      maxWidth: 400,
      minWith: 200
    });
  }

  toggleAnnotationLines(e) {
    var annotator = this;
    $(".annotator-options input").each(function() {
      attribute = $(this).attr("name");
      if ($(this).is(":checked")) {
        annotator.showAnnotationLine(attribute);
      } else {
        annotator.hideAnnotationLine(attribute);
      }
    });
  }

  showAnnotationLine(line) {
    $(".mand-block-" + line).css("display", "");
  }

  hideAnnotationLine(line) {
    $(".mand-block-" + line).css("display", "none");
  }

  mandBlockTemplate(wordData) {
    var annotator = this;
    var newText = "";
    var spaceBefore = "";
    function mandBlockSpanAttributes(wordData) {
      var attributeString = 'data-id="' + annotator.mandBlockID++ + '" ';
      for (i = 0; i < wordData.length; i++) {
        var word = wordData[i];
        for (var propertyName in word) {
          attributeString +=
            "data-" + propertyName + "-" + i + '="' + word[propertyName] + '" ';
        }
      }
      return attributeString;
    }
    function findBestCandidate(wordObjArray) {
      var i;
      for (i = 0; i < wordObjArray.length; i++) {
        if (wordObjArray[i][annotator.dictionary.primaryLine]) {
          return wordObjArray[i];
        }
      }
      return false;
    }
    // Determines whether a space should be inserted before a word block (only works with Chinese annotators)
    function spaceBeforeWordBlock(simplified) {
      // Attach these words to the word before
      // If the word before ends in an open quote or open parenthesis, make sure
      // the next word doesn't add a space
      if (annotator.wordBefore && annotator.wordBefore.match(/[“\(]+$/)) {
        return "";
      }
      // If the word ends in an open quote or open parenthesis, add a space before it
      if (annotator.wordBefore && annotator.wordBefore.match(/[“\(]+$/)) {
        return " ";
      }
      if (
        simplified &&
        simplified.match(/^([了着在过住起开呢吗啊呀么吧的]|起来)$/)
      ) {
        return "";
      }
      return " ";
    }

    function spaceBeforeString(string) {
      var spaceBefore = "";
      // If the word starts with a number or letter, add a space before it
      if (string.match(/^[\d\w]+/)) {
        spaceBefore = " ";
      }
      return spaceBefore;
    }

    function isWordCandidateObjs(wordData) {
      return Array.isArray(wordData);
    }
    if (isWordCandidateObjs(wordData)) {
      var attributeString = mandBlockSpanAttributes(wordData);
      var mostLikelyWordObj = findBestCandidate(wordData);
      var newText =
        newText + '<span class="mand-anno mand-block" ' + attributeString + ">";
      if (annotator.dictionary.addSpace)
        newText += spaceBeforeWordBlock(
          mostLikelyWordObj[annotator.primaryLine]
        );
      for (var i = 0; i < annotator.annotationLines.length; i++) {
        var annotationLine = annotator.annotationLines[i];
        var pinyinWidth =
          mostLikelyWordObj.pinyin == undefined
            ? ""
            : 'style="max-width: ' + mostLikelyWordObj.pinyin.length + 'em"';
        if (annotationLine == "definition") {
          mostLikelyWordObj["definition"] = mostLikelyWordObj[
            "definition"
          ].replace(/\[.*?\]/g, "");
          mostLikelyWordObj["definition"] = mostLikelyWordObj[
            "definition"
          ].replace(/\(.*?\)/g, "");
        }
        newText +=
          '<span class="mand-block-' + annotationLine + '" ' + pinyinWidth;
        if (annotationLine == "pinyin" || annotationLine == "mand") {
          newText += ' contenteditable="true"';
        }
        newText += ">";
        newText += mostLikelyWordObj[annotationLine];
        newText += "</span>";
      }
      newText += "</span>";

      annotator.wordBefore = mostLikelyWordObj[annotator.primaryLine];
    } else if (typeof wordData === "string") {
      newText +=
        '<span class="mand-anno mand-text">' +
        spaceBeforeString(wordData) +
        wordData +
        "</span>";
      annotator.wordBefore = wordData;
    }
    return newText;
  }
  annotateNodeWithJSON(dataForNode, node) {
    var annotator = this;

    // Make dataForNode in a nice readable pinyin form
    var annotatedHTML = "";
    annotator.wordBefore = "";

    annotator.map(dataForNode, function(wordData) {
      annotatedHTML += annotator.mandBlockTemplate(wordData);
    });
    (function replaceNodeWithHTML(oldNode, html) {
      $(oldNode).after(html + " ");
      var newNode = oldNode.nextSibling;
      $(oldNode).remove();
      return newNode;
    })(node, annotatedHTML);
  }

  findMaximumWeight() {
    var annotator = this;
    return Math.max.apply(
      Math,
      $(".mand-block").annotator.map(function() {
        return $(this).attr("data-weight-0");
      })
    );
  }

  findAverageWeight() {
    var annotator = this;
    var weights = $(".mand-block").annotator.map(function() {
      return $(this).attr("data-weight-0");
    });
    var sum = 0;
    for (var i = 0; i < weights.length; i++) {
      sum += parseInt(weights[i], 10); //don't forget to add the base
    }
    return (avg = sum / weights.length);
  }

  annotate(nodes, callback) {
    var annotator = this;
    var stringsToSend = [];
    stringsToSend = annotator.map(nodes, function(node) {
      return node.nodeValue;
    });

    function annotateWithJSON(nodes) {
      return function(dataForNodes) {
        var i;
        for (i = 0; i < dataForNodes.length; i++) {
          annotator.annotateNodeWithJSON(dataForNodes[i], nodes[i]);
        }

        annotator.addTooltips();

        // Hide annotation lines by user preference
        annotator.toggleAnnotationLines();

        $(".mand-block-simplified")
          .off("click")
          .on("click", function() {
            $(this)
              .parent()
              .toggleClass("mand-highlight");
          });
        $(".mand-block-traditional")
          .off("click")
          .on("click", function() {
            $(this)
              .parent()
              .toggleClass("mand-highlight");
          });
        annotator.doneBatches.push(nodes);
        if (annotator.batches.length === annotator.doneBatches.length) {
          callback();
        }
      };
    }

    var resourceUrl = annotator.dictionary.resourceUrl;

    var annotateNodesWithJSON = annotateWithJSON(nodes);

    $.post(
      resourceUrl,
      {
        "text[]": stringsToSend
      },
      annotateWithJSON(nodes),
      "json"
    );
  }

  executeAnnotationTasks(callback) {
    var annotator = this;
    var thisBatch = [];
    var numCharsSeen = 0;
    (function divideNodesIntoBatches() {
      for (var i = 0; i < annotator.nodesToAnnotate.length; i++) {
        numCharsSeen += annotator.nodesToAnnotate[i].nodeValue.trim().length;
        thisBatch.push(annotator.nodesToAnnotate[i]);
        if (numCharsSeen > annotator.maxNumCharsPerRequest) {
          annotator.batches.push(thisBatch);
          thisBatch = [];
          numCharsSeen = 0;
        }
      }
      if (thisBatch.length > 0) {
        annotator.batches.push(thisBatch);
      }
      annotator.nodesToAnnotate = [];
    })();

    (function annotateAtTimeIntervals() {
      var i = 0;
      function next() {
        if (i < annotator.batches.length) {
          annotator.annotate(annotator.batches[i], callback);
          setTimeout(next, annotator.timeout);
          i++;
        }
      }
      next();
    })();
  }

  addAnnotationTask(node) {
    var annotator = this;
    // Check if a string contains characters relavent to the dictionary
    // For example, for Chinese annotators, check if the node has Chinese
    function annotatable(s) {
      var matches = s.match(annotator.dictionary.annotatablePattern);
      return matches;
    }
    function collectionContains(collection, item) {
      return collection.indexOf(item) > -1;
    }
    function isTextNode(node) {
      return node.nodeType === 3 ? true : false;
    }
    if (isTextNode(node)) {
      if (annotatable(node.nodeValue)) {
        // If we have seen this word before, do nothing
        if (collectionContains(annotator.seenNodes, node)) {
          return;
        }
        annotator.nodesToAnnotate.push(node);
        annotator.seenNodes.push(node);
        annotator.numCharsInThisRequest =
          annotator.numCharsInThisRequest + node.nodeValue.length;
        annotator.totalRequests =
          annotator.totalRequests + node.nodeValue.length;
      }
    }
    return true;
  }

  annotateBySelector(selector, callback) {
    var annotator = this;
    annotator.selector = selector;
    (function addAnnotationTasksForEachChildNodes() {
      $(annotator.selector).each(function() {
        var children = this.childNodes;
        for (var i = 0; i < children.length; i++) {
          annotator.addAnnotationTask(children[i]);
        }
      });
    })();
    (function sortNodesByPositionOnPage() {
      annotator.nodesToAnnotate = annotator.nodesToAnnotate.sort(function(
        a,
        b
      ) {
        if (a.parentNode && b.parentNode) {
          var arect = a.parentNode.getBoundingClientRect();
          var atop = arect.top;
          var brect = b.parentNode.getBoundingClientRect();
          var btop = brect.top;
          return atop - btop;
        } else {
          return 0;
        }
      });
    })();

    annotator.executeAnnotationTasks(callback);
  }

  //TODO: improve name of function
  doAnnotate(e) {
    var annotator = this;
    if (e) e.preventDefault();

    $(".title").hide();

    $(annotator.selector).show();

    textToAnnotate = tinyMCE.activeEditor.getContent({ format: "raw" });

    (function addLineBreaks() {
      // If they already are marking up html, then don't add any p tags
      if (textToAnnotate.indexOf("</") == -1) {
        // Replace double line breaks with p tags
        textToAnnotate = textToAnnotate.replace(
          /(\r\n\r\n|\n\n|\r\r)/gm,
          "</p><p>"
        );
        // Replace single line breaks with br tags
        textToAnnotate = textToAnnotate.replace(/(\r\n|\n|\r)/gm, "<br>");
        // Wrap with a p tag
        textToAnnotate = "<p>" + textToAnnotate + "</p>";
      }
    })();

    // var stripLinks = function(text) {
    //     return text.replace(/<a[^>]*>(.*?)<\/a>/g, '$1');
    // }
    $(annotator.selector).html(textToAnnotate);

    (function showAnnotationArea() {
      if (
        $(annotator.selector)
          .parent()
          .css("display") == "none"
      ) {
        $(annotator.selector)
          .parent()
          .show();
      }
    })();

    // Hide the download link until the document is ready to download
    $("#annotator-file-buttons").hide();

    // Most of the time they don't have html, so p tags are automatically added, do these first
    annotateBySelector(annotator.selector + " p");

    $(".annotator-toolbars").css("display", "block");

    // Then do the rest of html if there is any
    annotateBySelector(annotator.selector);
    annotateBySelector(annotator.selector + " *");
  }

  toggleEditor(e) {
    var annotator = this;
    if (e) e.preventDefault();
    $(".hide-btn").html(
      $(".annotator-form").css("display") == "none"
        ? '<i class="glyphicon glyphicon-collapse-down"></i>' +
            annotator.dictionary.tHide
        : '<i class="glyphicon glyphicon-collapse-up"></i>' +
            annotator.dictionary.tShow
    );
    $(".annotator-form").toggle({ duration: 500 });
  }

  attachSpeakButtonEventListener() {
    var annotator = this;
    /* This doesn't work! speechSynthesis only reads about a sentence or two!  But well.. better than nothing.... */
    $("#annotator-speak-button").click(function(e) {
      if (e) e.preventDefault();
      if ($(this).text() == annotator.dictionary.tSpeak) {
        var text = tinyMCE.activeEditor.getContent({ format: "text" });
        if (!window.speechSynthesis.speaking) {
          annotator.speak(text);
        } else {
          window.speechSynthesis.resume();
        }
        $(this).html(
          '<i class="glyphicon-pause glyphicon"></i>' +
            annotator.dictionary.tPause
        );
      } else {
        $(this).html(
          '<i class="glyphicon-volume-up glyphicon"></i>' +
            annotator.dictionary.tSpeak
        );
        window.speechSynthesis.pause();
      }
    });
  }

  attachDifficultySliderEventListener() {
    var annotator = this;
    $("#difficulty-slider").change(function(e) {
      maxWeight = annotator.findMaximumWeight();
      rangeValue = $(this).val();
      threshold = Math.pow(rangeValue / 10000, 6);
      $(".mand-block").each(function() {
        if ($(this).attr("data-weight-0") < maxWeight * threshold) {
          $(this).addClass("mand-block-difficult");
        } else {
          $(this).removeClass("mand-block-difficult");
        }
      });
    });
  }

  attachDownloadODTButtonEventListener() {
    var annotator = this;
    $("#annotator-download-button").click(function(e) {
      if (e) e.preventDefault();
      function updateDownloadLink(data) {
        window.location = data.odt;
      }
      $.post(
        "/annotator/docx",
        {
          text: $(annotator.selector).html()
        },
        updateDownloadLink,
        "json"
      );
    });
  }

  attachVocabButtonEventListener() {
    var annotator = this;
    // find all user highlighted words
    $("#annotator-vocab-button").click(function(e) {
      if (e) e.preventDefault();
      $userHighlightedSpans = $(".mand-block.mand-highlight");

      // Find all automatically highlighted words by the difficulty slider

      $autoHighligtedSpans = $(".mand-block-difficult");

      // Get the definition picked by the user

      seenIds = [];

      function getWord() {
        word = {};
        word.pinyin = $(this)
          .find(".mand-block-pinyin")
          .text();
        word.simplified = $(this)
          .find(".mand-block-simplified")
          .text();
        word.definition = $(this)
          .find(".mand-block-definition")
          .text();
        if ((preferredDefIndex = $(this).attr("data-preferred-def-index"))) {
          word.id = $(this).attr("data-id-" + preferredDefIndex);
        } else {
          word.id = $(this).attr("data-id-0");
        }
        if (seenIds.indexOf(word.id) != -1) return; // We only want to show this word once.
        seenIds.push(word.id);
        return word;
      }

      userWords = $userHighlightedSpans.annotator.map(getWord).toArray();

      autoHighlightedWords = $autoHighligtedSpans.annotator
        .map(getWord)
        .toArray();

      // Make sure that there aren't repeats

      autoHighlightedWords.filter(function(word) {
        for (i in userWords) {
          if (userWords[i].id == word.id) return false;
        }
      });

      if (userWords.length == 0 && autoHighlightedWords.length == 0) {
        alert(
          'Please click on some words to highlight them first, or use the "Highlight Uncommon Words" slider.'
        );
        return;
      }

      // Show them below the annotation result

      if ($(".vocab-list").length == 0) {
        $(annotator.selector).after(
          '<div class="vocab-list" id="vocab-list"><div class="user-highlighted"></div><div class="auto-highlighted"></div></div>'
        );
      }

      function getVocabListHtml(words) {
        html = '<table class="table vocab-def-list">';
        for (i in words) {
          word = words[i];
          html += "<tr>";
          html += '<td class="vocab-simplified">' + word.simplified + "</td>";
          html += '<td class="vocab-pinyin">' + word.pinyin + "</td>";
          html += '<td class="vocab-definition">' + word.definition + "</td>";
          html += "</tr>";
        }

        html += "</table>";
        return html;
      }

      html = "";

      if (userWords.length > 0) {
        html += "<h3>Words You Highlighted</h3>";

        html += getVocabListHtml(userWords);
      }

      // If there aren't any automatically highlighted words, then hide this:

      if (autoHighlightedWords.length > 0) {
        html += '<h3>From "Highlight Uncommon Words" Slider</h3>';

        html += getVocabListHtml(autoHighlightedWords);
      }

      $(".vocab-list .user-highlighted").html(html);

      location.href = "#vocab-list";
    });
  }

  attachAnnotateButtonEventListener() {
    var annotator = this;
    $(".annotator-convert-button").click(annotator.doAnnotate);
  }

  attachMakeCopiableButtonEventListener() {
    var annotator = this;
    $("#annotator-copiable-button").click(function(e) {
      if (e) e.preventDefault();
      $(annotator.selector).toggleClass("copiable");
    });
  }

  attachAnnotatorOptionsCheckboxEventListeners() {
    var annotator = this;
    $(".annotator-options input").click(annotator.toggleAnnotationLines);
  }

  attachHideEditorButtonEventListener() {
    var annotator = this;
    $(".hide-btn").click(annotator.toggleEditor);
  }

  attachEventHandlers() {
    var annotator = this;

    annotator.attachVocabButtonEventListener();

    annotator.attachSpeakButtonEventListener();

    annotator.attachDownloadODTButtonEventListener();

    annotator.attachMakeCopiableButtonEventListener();

    annotator.attachAnnotateButtonEventListener();

    annotator.attachAnnotatorOptionsCheckboxEventListeners();

    annotator.attachHideEditorButtonEventListener();

    annotator.attachDifficultySliderEventListener();
  }

  isMobile() {
    // If the three-striped "open menu" icon is visible, then the user is viewing this on a small device.
    if ($(".navbar-toggle").css("display") != "none") return true;
  }

  /**
   * Initializes TinyMCE. Just pass in the selector for the <textarea>
   */
  initializeEidtor(tinyMCESelector) {
    var annotator = this;
    if (tinymce) {
      tinymce.init({
        // paste_as_text: true,
        selector: tinyMCESelector,
        theme: "modern",
        language: annotator.dictionary.locale,
        plugins: [
          "advlist autolink lists link image charmap print preview hr anchor pagebreak",
          "searchreplace wordcount visualblocks visualchars code fullscreen",
          "insertdatetime media nonbreaking save table contextmenu directionality",
          "emoticons template paste textcolor colorpicker textpattern"
        ],
        toolbar1:
          "insertfile undo redo | styleselect | fontselect |  fontsizeselect | bold italic | alignleft aligncenter alignright alignjustify | bullist numlist outdent indent | link image | forecolor backcolor emoticons",
        image_advtab: true,
        save_enablewhendirty: false
      });
    }
  }
}

$(document).ready(function() {
  annotator = new Annotator();

  // .hide
  annotator.annotateBySelector(".add-pinyin, .add-pinyin *", function() {
    // success
  });
});
