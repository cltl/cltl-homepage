// https://code.google.com/p/bibtex-js/
// ORIGNAL LICENSE: MIT

// (LMC) Changed the default template
// (LMC) Added more conversions (i.e. more special characters)
// (LMC) Added some JQuery to import a .bib file with the references

// (LMC) ORIGINAL DEAFULT TEMPLATE:
// "<div class=\"bibtex_template\"><div class=\"if author\" style=\"font-weight: bold;\">\n  <span class=\"if year\">\n    <span class=\"year\"></span>, \n  </span>\n  <span class=\"author\"></span>\n  <span class=\"if url\" style=\"margin-left: 20px\">\n    <a class=\"url\" style=\"color:black; font-size:10px\">(view online)</a>\n  </span>\n</div>\n<div style=\"margin-left: 10px; margin-bottom:5px;\">\n  <span class=\"title\"></span>\n</div></div>" 



// Issues:
//  no comment handling within strings
//  no string concatenation
//  no variable values yet

// Grammar implemented here:
//  bibtex -> (string | preamble | comment | entry)*;
//  string -> '@STRING' '{' key_equals_value '}';
//  preamble -> '@PREAMBLE' '{' value '}';
//  comment -> '@COMMENT' '{' value '}';
//  entry -> '@' key '{' key ',' key_value_list '}';
//  key_value_list -> key_equals_value (',' key_equals_value)*;
//  key_equals_value -> key '=' value;
//  value -> value_quotes | value_braces | key;
//  value_quotes -> '"' .*? '"'; // not quite
//  value_braces -> '{' .*? '"'; // not quite
function BibtexParser() {
  this.pos = 0;
  this.input = "";
  
  this.entries = {};
  this.strings = {
      JAN: "January",
      FEB: "February",
      MAR: "March",      
      APR: "April",
      MAY: "May",
      JUN: "June",
      JUL: "July",
      AUG: "August",
      SEP: "September",
      OCT: "October",
      NOV: "November",
      DEC: "December"
  };
  this.currentKey = "";
  this.currentEntry = "";
  

  this.setInput = function(t) {
    this.input = t;
  }
  
  this.getEntries = function() {
      return this.entries;
  }

  this.isWhitespace = function(s) {
    return (s == ' ' || s == '\r' || s == '\t' || s == '\n');
  }

  this.match = function(s) {
    this.skipWhitespace();
    if (this.input.substring(this.pos, this.pos+s.length) == s) {
      this.pos += s.length;
    } else {
      throw "Token mismatch, expected " + s + ", found " + this.input.substring(this.pos);
    }
    this.skipWhitespace();
  }

  this.tryMatch = function(s) {
    this.skipWhitespace();
    if (this.input.substring(this.pos, this.pos+s.length) == s) {
      return true;
    } else {
      return false;
    }
    this.skipWhitespace();
  }

  this.skipWhitespace = function() {
    while (this.isWhitespace(this.input[this.pos])) {
      this.pos++;
    }
    if (this.input[this.pos] == "%") {
      while(this.input[this.pos] != "\n") {
        this.pos++;
      }
      this.skipWhitespace();
    }
  }

  this.value_braces = function() {
    var bracecount = 0;
    this.match("{");
    var start = this.pos;
    while(true) {
      if (this.input[this.pos] == '}' && this.input[this.pos-1] != '\\') {
        if (bracecount > 0) {
          bracecount--;
        } else {
          var end = this.pos;
          this.match("}");
          return this.input.substring(start, end);
        }
      } else if (this.input[this.pos] == '{') {
        bracecount++;
      } else if (this.pos == this.input.length-1) {
        throw "Unterminated value";
      }
      this.pos++;
    }
  }

  this.value_quotes = function() {
    this.match('"');
    var start = this.pos;
    while(true) {
      if (this.input[this.pos] == '"' && this.input[this.pos-1] != '\\') {
          var end = this.pos;
          this.match('"');
          return this.input.substring(start, end);
      } else if (this.pos == this.input.length-1) {
        throw "Unterminated value:" + this.input.substring(start);
      }
      this.pos++;
    }
  }
  
  this.single_value = function() {
    var start = this.pos;
    if (this.tryMatch("{")) {
      return this.value_braces();
    } else if (this.tryMatch('"')) {
      return this.value_quotes();
    } else {
      var k = this.key();
      if (this.strings[k.toUpperCase()]) {
        return this.strings[k];
      } else if (k.match("^[0-9]+$")) {
        return k;
      } else {
        throw "Value expected:" + this.input.substring(start);
      }
    }
  }
  
  this.value = function() {
    var values = [];
    values.push(this.single_value());
    while (this.tryMatch("#")) {
      this.match("#");
      values.push(this.single_value());
    }
    return values.join("");
  }

  this.key = function() {
    var start = this.pos;
    while(true) {
      if (this.pos == this.input.length) {
        throw "Runaway key";
      }
    
      if (this.input[this.pos].match("[a-zA-Z0-9_:\\./-]")) {
        this.pos++
      } else {
        return this.input.substring(start, this.pos).toUpperCase();
      }
    }
  }

  this.key_equals_value = function() {
    var key = this.key();
    if (this.tryMatch("=")) {
      this.match("=");
      var val = this.value();
      return [ key, val ];
    } else {
      throw "... = value expected, equals sign missing:" + this.input.substring(this.pos);
    }
  }

  this.key_value_list = function() {
    var kv = this.key_equals_value();
    this.entries[this.currentEntry][kv[0]] = kv[1];
    while (this.tryMatch(",")) {
      this.match(",");
      // fixes problems with commas at the end of a list
      if (this.tryMatch("}")) {
        break;
      }
      kv = this.key_equals_value();
      this.entries[this.currentEntry][kv[0]] = kv[1];
    }
  }

  this.entry_body = function() {
    this.currentEntry = this.key();
    this.entries[this.currentEntry] = new Object();    
    this.match(",");
    this.key_value_list();
  }

  this.directive = function () {
    this.match("@");
    return "@"+this.key();
  }

  this.string = function () {
    var kv = this.key_equals_value();
    this.strings[kv[0].toUpperCase()] = kv[1];
  }

  this.preamble = function() {
    this.value();
  }

  this.comment = function() {
    this.value(); // this is wrong
  }

  this.entry = function() {
    this.entry_body();
  }

  this.bibtex = function() {
    while(this.tryMatch("@")) {
      var d = this.directive().toUpperCase();
      this.match("{");
      if (d == "@STRING") {
        this.string();
      } else if (d == "@PREAMBLE") {
        this.preamble();
      } else if (d == "@COMMENT") {
        this.comment();
      } else {
        this.entry();
      }
      this.match("}");
    }
  }
}

function BibtexDisplay() {
  this.fixValue = function (value) {
    value = value.replace(/\\glqq\s?/g, "&bdquo;");
    value = value.replace(/\\grqq\s?/g, '&rdquo;');
    value = value.replace(/\\ /g, '&nbsp;');
    value = value.replace(/\\url/g, '');
    value = value.replace(/---/g, '&mdash;');
    value = value.replace(/{\\"a}/g, '&auml;');
    value = value.replace(/\{\\"o\}/g, '&ouml;');
    value = value.replace(/{\\"u}/g, '&uuml;');
    value = value.replace(/{\\"A}/g, '&Auml;');
    value = value.replace(/{\\"O}/g, '&Ouml;');
    value = value.replace(/{\\"U}/g, '&Uuml;');
    value = value.replace(/\\ss/g, '&szlig;');

    // (LMC) ADDED
    value = value.replace(/--/g, '&ndash;');
    value = value.replace(/\\&/g, '&amp;');
    value = value.replace(/\\`{o}/g, 'ò');
    value = value.replace(/\\c{h}/g,'\u1E29');
    value = value.replace(/{\\textregistered}/g,"\u00AE");

    value = value.replace(/\\url/g,"");  // strip 'url'
    value = value.replace(/\\href/g, ""); // strip 'href'
    value = value.replace(/{\\textexclamdown}/g, "\u00A1"); // INVERTED EXCLAMATION MARK
    value = value.replace(/{\\textcent}/g, "\u00A2"); // CENT SIGN
    value = value.replace(/{\\textsterling}/g, "\u00A3"); // POUND SIGN
    value = value.replace(/{\\textyen}/g, "\u00A5"); // YEN SIGN
    value = value.replace(/{\\textbrokenbar}/g, "\u00A6"); // BROKEN BAR
    value = value.replace(/{\\textsection}/g, "\u00A7"); // SECTION SIGN
    value = value.replace(/{\\textasciidieresis}/g, "\u00A8"); // DIAERESIS
    value = value.replace(/{\\textcopyright}/g, "\u00A9"); // COPYRIGHT SIGN
    value = value.replace(/{\\textordfeminine}/g, "\u00AA"); // FEMININE ORDINAL INDICATOR
    value = value.replace(/{\\guillemotleft}/g, "\u00AB"); // LEFT-POINTING DOUBLE ANGLE QUOTATION MARK
    value = value.replace(/{\\textlnot}/g, "\u00AC"); // NOT SIGN
    value = value.replace(/{\\textregistered}/g, "\u00AE"); // REGISTERED SIGN
    value = value.replace(/{\\textasciimacron}/g, "\u00AF"); // MACRON
    value = value.replace(/{\\textdegree}/g, "\u00B0"); // DEGREE SIGN
    value = value.replace(/{\\textpm}/g, "\u00B1"); // PLUS-MINUS SIGN
    value = value.replace(/{\\texttwosuperior}/g, "\u00B2"); // SUPERSCRIPT TWO
    value = value.replace(/{\\textthreesuperior}/g, "\u00B3"); // SUPERSCRIPT THREE
    value = value.replace(/{\\textasciiacute}/g, "\u00B4"); // ACUTE ACCENT
    value = value.replace(/{\\textmu}/g, "\u00B5"); // MICRO SIGN
    value = value.replace(/{\\textparagraph}/g, "\u00B6"); // PILCROW SIGN
    value = value.replace(/{\\textperiodcentered}/g, "\u00B7"); // MIDDLE DOT
    value = value.replace(/{\\c\\ }/g, "\u00B8"); // CEDILLA
    value = value.replace(/{\\textonesuperior}/g, "\u00B9"); // SUPERSCRIPT ONE
    value = value.replace(/{\\textordmasculine}/g, "\u00BA"); // MASCULINE ORDINAL INDICATOR
    value = value.replace(/{\\guillemotright}/g, "\u00BB"); // RIGHT-POINTING DOUBLE ANGLE QUOTATION MARK
    value = value.replace(/{\\textonequarter}/g, "\u00BC"); // VULGAR FRACTION ONE QUARTER
    value = value.replace(/{\\textonehalf}/g, "\u00BD"); // VULGAR FRACTION ONE HALF
    value = value.replace(/{\\textthreequarters}/g, "\u00BE"); // VULGAR FRACTION THREE QUARTERS
    value = value.replace(/{\\textquestiondown}/g, "\u00BF"); // INVERTED QUESTION MARK
    value = value.replace(/{\\AE}/g, "\u00C6"); // LATIN CAPITAL LETTER AE
    value = value.replace(/{\\DH}/g, "\u00D0"); // LATIN CAPITAL LETTER ETH
    value = value.replace(/{\\texttimes}/g, "\u00D7"); // MULTIPLICATION SIGN
    value = value.replace(/{\\O}/g, "\u00D8"); // LATIN SMALL LETTER O WITH STROKE
    value = value.replace(/{\\TH}/g, "\u00DE"); // LATIN CAPITAL LETTER THORN
    value = value.replace(/{\\ss}/g, "\u00DF"); // LATIN SMALL LETTER SHARP S
    value = value.replace(/{\\ae}/g, "\u00E6"); // LATIN SMALL LETTER AE
    value = value.replace(/{\\dh}/g, "\u00F0"); // LATIN SMALL LETTER ETH
    value = value.replace(/{\\textdiv}/g, "\u00F7"); // DIVISION SIGN
    value = value.replace(/{\\o}/g, "\u00F8"); // LATIN SMALL LETTER O WITH STROKE
    value = value.replace(/{\\th}/g, "\u00FE"); // LATIN SMALL LETTER THORN
    value = value.replace(/{\\i}/g, "\u0131"); // LATIN SMALL LETTER DOTLESS I
    value = value.replace(/'n/g, "\u0149"); // LATIN SMALL LETTER N PRECEDED BY APOSTROPHE
    value = value.replace(/{\\NG}/g, "\u014A"); // LATIN CAPITAL LETTER ENG
    value = value.replace(/{\\ng}/g, "\u014B"); // LATIN SMALL LETTER ENG
    value = value.replace(/{\\OE}/g, "\u0152"); // LATIN CAPITAL LIGATURE OE
    value = value.replace(/{\\oe}/g, "\u0153"); // LATIN SMALL LIGATURE OE
    value = value.replace(/{\\textasciicircum}/g, "\u02C6"); // MODIFIER LETTER CIRCUMFLEX ACCENT
    value = value.replace(/{\\textacutedbl}/g, "\u02DD"); // DOUBLE ACUTE ACCENT
    value = value.replace(/{\\textendash}/g, "\u2013"); // EN DASH
    value = value.replace(/{\\textemdash}/g, "\u2014"); // EM DASH
    value = value.replace(/---/g, "\u2014"); // EM DASH
    value = value.replace(/--/g, "\u2013"); // EN DASH
    value = value.replace(/{\\textbardbl}/g, "\u2016"); // DOUBLE VERTICAL LINE
    value = value.replace(/{\\textunderscore}/g, "\u2017"); // DOUBLE LOW LINE
    value = value.replace(/{\\textquoteleft}/g, "\u2018"); // LEFT SINGLE QUOTATION MARK
    value = value.replace(/{\\textquoteright}/g, "\u2019"); // RIGHT SINGLE QUOTATION MARK
    value = value.replace(/{\\quotesinglbase}/g, "\u201A"); // SINGLE LOW-9 QUOTATION MARK
    value = value.replace(/{\\textquotedblleft}/g, "\u201C"); // LEFT DOUBLE QUOTATION MARK
    value = value.replace(/{\\textquotedblright}/g, "\u201D"); // RIGHT DOUBLE QUOTATION MARK
    value = value.replace(/{\\quotedblbase}/g, "\u201E"); // DOUBLE LOW-9 QUOTATION MARK
    value = value.replace(/{\\textdagger}/g, "\u2020"); // DAGGER
    value = value.replace(/{\\textdaggerdbl}/g, "\u2021"); // DOUBLE DAGGER
    value = value.replace(/{\\textbullet}/g, "\u2022"); // BULLET
    value = value.replace(/{\\textellipsis}/g, "\u2026"); // HORIZONTAL ELLIPSIS
    value = value.replace(/{\\textperthousand}/g, "\u2030"); // PER MILLE SIGN

    value = value.replace(/'''/g, "\u2034"); // TRIPLE PRIME
    value = value.replace(/''/g, "\u201D"); // RIGHT DOUBLE QUOTATION MARK (could be a double prime)
    value = value.replace(/``/g, "\u201C"); // LEFT DOUBLE QUOTATION MARK (could be a reversed double prime)
    value = value.replace(/```/g, "\u2037"); // REVERSED TRIPLE PRIME
    value = value.replace(/{\\guilsinglleft}/g, "\u2039"); // SINGLE LEFT-POINTING ANGLE QUOTATION MARK
    value = value.replace(/{\\guilsinglright}/g, "\u203A"); // SINGLE RIGHT-POINTING ANGLE QUOTATION MARK
    value = value.replace(/!!/g, "\u203C"); // DOUBLE EXCLAMATION MARK
    value = value.replace(/{\\textfractionsolidus}/g, "\u2044"); // FRACTION SLASH


    // value = value.replace(/?!/g, "\u2048"); // QUESTION EXCLAMATION MARK
    // value = value.replace(/!?/g, "\u2049"); // EXCLAMATION QUESTION MARK
    // value = value.replace(/$^{0}$/g, "\u2070"); // SUPERSCRIPT ZERO
    // value = value.replace(/$^{4}$/g, "\u2074"); // SUPERSCRIPT FOUR
    // value = value.replace(/$^{5}$/g, "\u2075"); // SUPERSCRIPT FIVE
    // value = value.replace(/$^{6}$/g, "\u2076"); // SUPERSCRIPT SIX
    // value = value.replace(/$^{7}$/g, "\u2077"); // SUPERSCRIPT SEVEN
    // value = value.replace(/$^{8}$/g, "\u2078"); // SUPERSCRIPT EIGHT
    // value = value.replace(/$^{9}$/g, "\u2079"); // SUPERSCRIPT NINE
    // value = value.replace(/$^{+}$/g, "\u207A"); // SUPERSCRIPT PLUS SIGN
    // value = value.replace(/$^{-}$/g, "\u207B"); // SUPERSCRIPT MINUS
    // value = value.replace(/$^{=}$/g, "\u207C"); // SUPERSCRIPT EQUALS SIGN
    // value = value.replace(/$^{(}$/g, "\u207D"); // SUPERSCRIPT LEFT PARENTHESIS
    // value = value.replace(/$^{)}$/g, "\u207E"); // SUPERSCRIPT RIGHT PARENTHESIS
    // value = value.replace(/$^{n}$/g, "\u207F"); // SUPERSCRIPT LATIN SMALL LETTER N
    // value = value.replace(/$_{0}$/g, "\u2080"); // SUBSCRIPT ZERO
    // value = value.replace(/$_{1}$/g, "\u2081"); // SUBSCRIPT ONE
    // value = value.replace(/$_{2}$/g, "\u2082"); // SUBSCRIPT TWO
    // value = value.replace(/$_{3}$/g, "\u2083"); // SUBSCRIPT THREE
    // value = value.replace(/$_{4}$/g, "\u2084"); // SUBSCRIPT FOUR
    // value = value.replace(/$_{5}$/g, "\u2085"); // SUBSCRIPT FIVE
    // value = value.replace(/$_{6}$/g, "\u2086"); // SUBSCRIPT SIX
    // value = value.replace(/$_{7}$/g, "\u2087"); // SUBSCRIPT SEVEN
    // value = value.replace(/$_{8}$/g, "\u2088"); // SUBSCRIPT EIGHT
    // value = value.replace(/$_{9}$/g, "\u2089"); // SUBSCRIPT NINE
    // value = value.replace(/$_{+}$/g, "\u208A"); // SUBSCRIPT PLUS SIGN
    // value = value.replace(/$_{-}$/g, "\u208B"); // SUBSCRIPT MINUS
    // value = value.replace(/$_{=}$/g, "\u208C"); // SUBSCRIPT EQUALS SIGN
    // value = value.replace(/$_{(}$/g, "\u208D"); // SUBSCRIPT LEFT PARENTHESIS
    // value = value.replace(/$_{)}$/g, "\u208E"); // SUBSCRIPT RIGHT PARENTHESIS

    value = value.replace(/{\\texteuro}/g, "\u20AC"); // EURO SIGN
    value = value.replace(/{\\textcelsius}/g, "\u2103"); // DEGREE CELSIUS
    value = value.replace(/{\\textnumero}/g, "\u2116"); // NUMERO SIGN
    value = value.replace(/{\\textcircledP}/g, "\u2117"); // SOUND RECORDING COPYRIGHT
    value = value.replace(/{\\textservicemark}/g, "\u2120"); // SERVICE MARK
    value = value.replace(/{TEL}/g, "\u2121"); // TELEPHONE SIGN
    value = value.replace(/{\\texttrademark}/g, "\u2122"); // TRADE MARK SIGN
    value = value.replace(/{\\textohm}/g, "\u2126"); // OHM SIGN
    value = value.replace(/{\\textestimated}/g, "\u212E"); // ESTIMATED SYMBOL
    value = value.replace(/{\\textleftarrow}/g, "\u2190"); // LEFTWARDS ARROW
    value = value.replace(/{\\textuparrow}/g, "\u2191"); // UPWARDS ARROW
    value = value.replace(/{\\textrightarrow}/g, "\u2192"); // RIGHTWARDS ARROW
    value = value.replace(/{\\textdownarrow}/g, "\u2193"); // DOWNWARDS ARROW
    value = value.replace(/<->/g, "\u2194"); // LEFT RIGHT ARROW
    value = value.replace(/<=/g, "\u21D0"); // LEFTWARDS DOUBLE ARROW
    value = value.replace(/=>/g, "\u21D2"); // RIGHTWARDS DOUBLE ARROW
    value = value.replace(/<=>/g, "\u21D4"); // LEFT RIGHT DOUBLE ARROW
    value = value.replace(/$\\infty$/g, "\u221E"); // INFINITY

    value = value.replace(/\/=/g, "\u2260"); // NOT EQUAL TO
    // value = value.replace(/<=/g, "\u2264"); // LESS-THAN OR EQUAL TO
    // value = value.replace(/>=/g, "\u2265"); // GREATER-THAN OR EQUAL TO
    // value = value.replace(/<</g, "\u226A"); // MUCH LESS-THAN
    // value = value.replace(/>>/g, "\u226B"); // MUCH GREATER-THAN
    // value = value.replace(/(+)/g, "\u2295"); // CIRCLED PLUS
    // value = value.replace(/(-)/g, "\u2296"); // CIRCLED MINUS
    // value = value.replace(/(x)/g, "\u2297"); // CIRCLED TIMES
    // value = value.replace(/(\/)/g, "\u2298"); // CIRCLED DIVISION SLASH
    // value = value.replace(/|-/g, "\u22A2"); // RIGHT TACK
    // value = value.replace(/-|/g, "\u22A3"); // LEFT TACK
    // value = value.replace(/|=/g, "\u22A7"); // MODELS
    // value = value.replace(/||-/g, "\u22A9"); // FORCES
    // value = value.replace(/$\\#$/g, "\u22D5"); // EQUAL AND PARALLEL TO
    // value = value.replace(/<<</g, "\u22D8"); // VERY MUCH LESS-THAN
    // value = value.replace(/>>>/g, "\u22D9"); // VERY MUCH GREATER-THAN
    value = value.replace(/{\\textlangle}/g, "\u2329"); // LEFT-POINTING ANGLE BRACKET
    value = value.replace(/{\\textrangle}/g, "\u232A"); // RIGHT-POINTING ANGLE BRACKET
    value = value.replace(/{\\textvisiblespace}/g, "\u2423"); // OPEN BOX
    value = value.replace(/{\\textopenbullet}/g, "\u25E6"); // WHITE BULLET
    value = value.replace(/$\\%<$/g, "\u2701"); // UPPER BLADE SCISSORS
    value = value.replace(/$\\%<$/g, "\u2703"); // LOWER BLADE SCISSORS

    // /* Derived accented characters */
    value = value.replace(/\\`{A}/g, "\u00C0"); // LATIN CAPITAL LETTER A WITH GRAVE
    value = value.replace(/\\'{A}/g, "\u00C1"); // LATIN CAPITAL LETTER A WITH ACUTE
    value = value.replace(/\\^{A}/g, "\u00C2"); // LATIN CAPITAL LETTER A WITH CIRCUMFLEX
    value = value.replace(/\\~{A}/g, "\u00C3"); // LATIN CAPITAL LETTER A WITH TILDE
    value = value.replace(/\\\"{A}/g, "\u00C4"); // LATIN CAPITAL LETTER A WITH DIAERESIS
    value = value.replace(/\\r{A}/g, "\u00C5"); // LATIN CAPITAL LETTER A WITH RING ABOVE
    value = value.replace(/\\c{C}/g, "\u00C7"); // LATIN CAPITAL LETTER C WITH CEDILLA
    value = value.replace(/\\`{E}/g, "\u00C8"); // LATIN CAPITAL LETTER E WITH GRAVE
    value = value.replace(/\\'{E}/g, "\u00C9"); // LATIN CAPITAL LETTER E WITH ACUTE
    value = value.replace(/\\^{E}/g, "\u00CA"); // LATIN CAPITAL LETTER E WITH CIRCUMFLEX
    value = value.replace(/\\\"{E}/g, "\u00CB"); // LATIN CAPITAL LETTER E WITH DIAERESIS
    value = value.replace(/\\`{I}/g, "\u00CC"); // LATIN CAPITAL LETTER I WITH GRAVE
    value = value.replace(/\\'{I}/g, "\u00CD"); // LATIN CAPITAL LETTER I WITH ACUTE
    value = value.replace(/\\^{I}/g, "\u00CE"); // LATIN CAPITAL LETTER I WITH CIRCUMFLEX
    value = value.replace(/\\\"{I}/g, "\u00CF"); // LATIN CAPITAL LETTER I WITH DIAERESIS
    value = value.replace(/\\~{N}/g, "\u00D1"); // LATIN CAPITAL LETTER N WITH TILDE
    value = value.replace(/\\`{O}/g, "\u00D2"); // LATIN CAPITAL LETTER O WITH GRAVE
    value = value.replace(/\\'{O}/g, "\u00D3"); // LATIN CAPITAL LETTER O WITH ACUTE
    value = value.replace(/\\^{O}/g, "\u00D4"); // LATIN CAPITAL LETTER O WITH CIRCUMFLEX
    value = value.replace(/\\~{O}/g, "\u00D5"); // LATIN CAPITAL LETTER O WITH TILDE
    value = value.replace(/\\\"{O}/g, "\u00D6"); // LATIN CAPITAL LETTER O WITH DIAERESIS
    value = value.replace(/\\`{U}/g, "\u00D9"); // LATIN CAPITAL LETTER U WITH GRAVE
    value = value.replace(/\\'{U}/g, "\u00DA"); // LATIN CAPITAL LETTER U WITH ACUTE
    value = value.replace(/\\^{U}/g, "\u00DB"); // LATIN CAPITAL LETTER U WITH CIRCUMFLEX
    value = value.replace(/\\\"{U}/g, "\u00DC"); // LATIN CAPITAL LETTER U WITH DIAERESIS
    value = value.replace(/\\'{Y}/g, "\u00DD"); // LATIN CAPITAL LETTER Y WITH ACUTE
    value = value.replace(/\\`{a}/g, "\u00E0"); // LATIN SMALL LETTER A WITH GRAVE
    value = value.replace(/\\'{a}/g, "\u00E1"); // LATIN SMALL LETTER A WITH ACUTE
    value = value.replace(/\\^{a}/g, "\u00E2"); // LATIN SMALL LETTER A WITH CIRCUMFLEX
    value = value.replace(/\\~{a}/g, "\u00E3"); // LATIN SMALL LETTER A WITH TILDE
    value = value.replace(/\\\"{a}/g, "\u00E4"); // LATIN SMALL LETTER A WITH DIAERESIS
    value = value.replace(/\\r{a}/g, "\u00E5"); // LATIN SMALL LETTER A WITH RING ABOVE
    value = value.replace(/\\c{c}/g, "\u00E7"); // LATIN SMALL LETTER C WITH CEDILLA
    value = value.replace(/\\`{e}/g, "\u00E8"); // LATIN SMALL LETTER E WITH GRAVE
    value = value.replace(/\\'{e}/g, "\u00E9"); // LATIN SMALL LETTER E WITH ACUTE
    value = value.replace(/\\^{e}/g, "\u00EA"); // LATIN SMALL LETTER E WITH CIRCUMFLEX
    value = value.replace(/\\\"{e}/g, "\u00EB"); // LATIN SMALL LETTER E WITH DIAERESIS
    value = value.replace(/\\`{i}/g, "\u00EC"); // LATIN SMALL LETTER I WITH GRAVE
    value = value.replace(/\\'{i}/g, "\u00ED"); // LATIN SMALL LETTER I WITH ACUTE
    value = value.replace(/\\^{i}/g, "\u00EE"); // LATIN SMALL LETTER I WITH CIRCUMFLEX
    value = value.replace(/\\\"{i}/g, "\u00EF"); // LATIN SMALL LETTER I WITH DIAERESIS
    value = value.replace(/\\~{n}/g, "\u00F1"); // LATIN SMALL LETTER N WITH TILDE
    value = value.replace(/\\`{o}/g, "\u00F2"); // LATIN SMALL LETTER O WITH GRAVE
    value = value.replace(/\\'{o}/g, "\u00F3"); // LATIN SMALL LETTER O WITH ACUTE
    value = value.replace(/\\^{o}/g, "\u00F4"); // LATIN SMALL LETTER O WITH CIRCUMFLEX
    value = value.replace(/\\~{o}/g, "\u00F5"); // LATIN SMALL LETTER O WITH TILDE
    value = value.replace(/\\\"{o}/g, "\u00F6"); // LATIN SMALL LETTER O WITH DIAERESIS
    value = value.replace(/\\`{u}/g, "\u00F9"); // LATIN SMALL LETTER U WITH GRAVE
    value = value.replace(/\\'{u}/g, "\u00FA"); // LATIN SMALL LETTER U WITH ACUTE
    value = value.replace(/\\^{u}/g, "\u00FB"); // LATIN SMALL LETTER U WITH CIRCUMFLEX
    value = value.replace(/\\\"{u}/g, "\u00FC"); // LATIN SMALL LETTER U WITH DIAERESIS
    value = value.replace(/\\'{y}/g, "\u00FD"); // LATIN SMALL LETTER Y WITH ACUTE
    value = value.replace(/\\\"{y}/g, "\u00FF"); // LATIN SMALL LETTER Y WITH DIAERESIS
    value = value.replace(/\\={A}/g, "\u0100"); // LATIN CAPITAL LETTER A WITH MACRON
    value = value.replace(/\\={a}/g, "\u0101"); // LATIN SMALL LETTER A WITH MACRON
    value = value.replace(/\\u{A}/g, "\u0102"); // LATIN CAPITAL LETTER A WITH BREVE
    value = value.replace(/\\u{a}/g, "\u0103"); // LATIN SMALL LETTER A WITH BREVE
    value = value.replace(/\\k{A}/g, "\u0104"); // LATIN CAPITAL LETTER A WITH OGONEK
    value = value.replace(/\\k{a}/g, "\u0105"); // LATIN SMALL LETTER A WITH OGONEK
    value = value.replace(/\\'{C}/g, "\u0106"); // LATIN CAPITAL LETTER C WITH ACUTE
    value = value.replace(/\\'{c}/g, "\u0107"); // LATIN SMALL LETTER C WITH ACUTE
    value = value.replace(/\\^{C}/g, "\u0108"); // LATIN CAPITAL LETTER C WITH CIRCUMFLEX
    value = value.replace(/\\^{c}/g, "\u0109"); // LATIN SMALL LETTER C WITH CIRCUMFLEX
    value = value.replace(/\\.{C}/g, "\u010A"); // LATIN CAPITAL LETTER C WITH DOT ABOVE
    value = value.replace(/\\.{c}/g, "\u010B"); // LATIN SMALL LETTER C WITH DOT ABOVE
    value = value.replace(/\\v{C}/g, "\u010C"); // LATIN CAPITAL LETTER C WITH CARON
    value = value.replace(/\\v{c}/g, "\u010D"); // LATIN SMALL LETTER C WITH CARON
    value = value.replace(/\\v{D}/g, "\u010E"); // LATIN CAPITAL LETTER D WITH CARON
    value = value.replace(/\\v{d}/g, "\u010F"); // LATIN SMALL LETTER D WITH CARON
    value = value.replace(/\\={E}/g, "\u0112"); // LATIN CAPITAL LETTER E WITH MACRON
    value = value.replace(/\\={e}/g, "\u0113"); // LATIN SMALL LETTER E WITH MACRON
    value = value.replace(/\\u{E}/g, "\u0114"); // LATIN CAPITAL LETTER E WITH BREVE
    value = value.replace(/\\u{e}/g, "\u0115"); // LATIN SMALL LETTER E WITH BREVE
    value = value.replace(/\\.{E}/g, "\u0116"); // LATIN CAPITAL LETTER E WITH DOT ABOVE
    value = value.replace(/\\.{e}/g, "\u0117"); // LATIN SMALL LETTER E WITH DOT ABOVE
    value = value.replace(/\\k{E}/g, "\u0118"); // LATIN CAPITAL LETTER E WITH OGONEK
    value = value.replace(/\\k{e}/g, "\u0119"); // LATIN SMALL LETTER E WITH OGONEK
    value = value.replace(/\\v{E}/g, "\u011A"); // LATIN CAPITAL LETTER E WITH CARON
    value = value.replace(/\\v{e}/g, "\u011B"); // LATIN SMALL LETTER E WITH CARON
    value = value.replace(/\\^{G}/g, "\u011C"); // LATIN CAPITAL LETTER G WITH CIRCUMFLEX
    value = value.replace(/\\^{g}/g, "\u011D"); // LATIN SMALL LETTER G WITH CIRCUMFLEX
    value = value.replace(/\\u{G}/g, "\u011E"); // LATIN CAPITAL LETTER G WITH BREVE
    value = value.replace(/\\u{g}/g, "\u011F"); // LATIN SMALL LETTER G WITH BREVE
    value = value.replace(/\\.{G}/g, "\u0120"); // LATIN CAPITAL LETTER G WITH DOT ABOVE
    value = value.replace(/\\.{g}/g, "\u0121"); // LATIN SMALL LETTER G WITH DOT ABOVE
    value = value.replace(/\\c{G}/g, "\u0122"); // LATIN CAPITAL LETTER G WITH CEDILLA
    value = value.replace(/\\c{g}/g, "\u0123"); // LATIN SMALL LETTER G WITH CEDILLA
    value = value.replace(/\\^{H}/g, "\u0124"); // LATIN CAPITAL LETTER H WITH CIRCUMFLEX
    value = value.replace(/\\^{h}/g, "\u0125"); // LATIN SMALL LETTER H WITH CIRCUMFLEX
    value = value.replace(/\\~{I}/g, "\u0128"); // LATIN CAPITAL LETTER I WITH TILDE
    value = value.replace(/\\~{i}/g, "\u0129"); // LATIN SMALL LETTER I WITH TILDE
    value = value.replace(/\\={I}/g, "\u012A"); // LATIN CAPITAL LETTER I WITH MACRON
    value = value.replace(/\\={i}/g, "\u012B"); // LATIN SMALL LETTER I WITH MACRON
    value = value.replace(/\\={\\i}/g, "\u012B"); // LATIN SMALL LETTER I WITH MACRON
    value = value.replace(/\\u{I}/g, "\u012C"); // LATIN CAPITAL LETTER I WITH BREVE
    value = value.replace(/\\u{i}/g, "\u012D"); // LATIN SMALL LETTER I WITH BREVE
    value = value.replace(/\\k{I}/g, "\u012E"); // LATIN CAPITAL LETTER I WITH OGONEK
    value = value.replace(/\\k{i}/g, "\u012F"); // LATIN SMALL LETTER I WITH OGONEK
    value = value.replace(/\\.{I}/g, "\u0130"); // LATIN CAPITAL LETTER I WITH DOT ABOVE
    value = value.replace(/\\^{J}/g, "\u0134"); // LATIN CAPITAL LETTER J WITH CIRCUMFLEX
    value = value.replace(/\\^{j}/g, "\u0135"); // LATIN SMALL LETTER J WITH CIRCUMFLEX
    value = value.replace(/\\c{K}/g, "\u0136"); // LATIN CAPITAL LETTER K WITH CEDILLA
    value = value.replace(/\\c{k}/g, "\u0137"); // LATIN SMALL LETTER K WITH CEDILLA
    value = value.replace(/\\'{L}/g, "\u0139"); // LATIN CAPITAL LETTER L WITH ACUTE
    value = value.replace(/\\'{l}/g, "\u013A"); // LATIN SMALL LETTER L WITH ACUTE
    value = value.replace(/\\c{L}/g, "\u013B"); // LATIN CAPITAL LETTER L WITH CEDILLA
    value = value.replace(/\\c{l}/g, "\u013C"); // LATIN SMALL LETTER L WITH CEDILLA
    value = value.replace(/\\v{L}/g, "\u013D"); // LATIN CAPITAL LETTER L WITH CARON
    value = value.replace(/\\v{l}/g, "\u013E"); // LATIN SMALL LETTER L WITH CARON
    value = value.replace(/\\L{}/g, "\u0141"); //LATIN CAPITAL LETTER L WITH STROKE
    value = value.replace(/\\l{}/g, "\u0142"); //LATIN SMALL LETTER L WITH STROKE
    value = value.replace(/\\'{N}/g, "\u0143"); // LATIN CAPITAL LETTER N WITH ACUTE
    value = value.replace(/\\'{n}/g, "\u0144"); // LATIN SMALL LETTER N WITH ACUTE
    value = value.replace(/\\c{N}/g, "\u0145"); // LATIN CAPITAL LETTER N WITH CEDILLA
    value = value.replace(/\\c{n}/g, "\u0146"); // LATIN SMALL LETTER N WITH CEDILLA
    value = value.replace(/\\v{N}/g, "\u0147"); // LATIN CAPITAL LETTER N WITH CARON
    value = value.replace(/\\v{n}/g, "\u0148"); // LATIN SMALL LETTER N WITH CARON
    value = value.replace(/\\={O}/g, "\u014C"); // LATIN CAPITAL LETTER O WITH MACRON
    value = value.replace(/\\={o}/g, "\u014D"); // LATIN SMALL LETTER O WITH MACRON
    value = value.replace(/\\u{O}/g, "\u014E"); // LATIN CAPITAL LETTER O WITH BREVE
    value = value.replace(/\\u{o}/g, "\u014F"); // LATIN SMALL LETTER O WITH BREVE
    value = value.replace(/\\H{O}/g, "\u0150"); // LATIN CAPITAL LETTER O WITH DOUBLE ACUTE
    value = value.replace(/\\H{o}/g, "\u0151"); // LATIN SMALL LETTER O WITH DOUBLE ACUTE
    value = value.replace(/\\'{R}/g, "\u0154"); // LATIN CAPITAL LETTER R WITH ACUTE
    value = value.replace(/\\'{r}/g, "\u0155"); // LATIN SMALL LETTER R WITH ACUTE
    value = value.replace(/\\c{R}/g, "\u0156"); // LATIN CAPITAL LETTER R WITH CEDILLA
    value = value.replace(/\\c{r}/g, "\u0157"); // LATIN SMALL LETTER R WITH CEDILLA
    value = value.replace(/\\v{R}/g, "\u0158"); // LATIN CAPITAL LETTER R WITH CARON
    value = value.replace(/\\v{r}/g, "\u0159"); // LATIN SMALL LETTER R WITH CARON
    value = value.replace(/\\'{S}/g, "\u015A"); // LATIN CAPITAL LETTER S WITH ACUTE
    value = value.replace(/\\'{s}/g, "\u015B"); // LATIN SMALL LETTER S WITH ACUTE
    value = value.replace(/\\^{S}/g, "\u015C"); // LATIN CAPITAL LETTER S WITH CIRCUMFLEX
    value = value.replace(/\\^{s}/g, "\u015D"); // LATIN SMALL LETTER S WITH CIRCUMFLEX
    value = value.replace(/\\c{S}/g, "\u015E"); // LATIN CAPITAL LETTER S WITH CEDILLA
    value = value.replace(/\\c{s}/g, "\u015F"); // LATIN SMALL LETTER S WITH CEDILLA
    value = value.replace(/\\v{S}/g, "\u0160"); // LATIN CAPITAL LETTER S WITH CARON
    value = value.replace(/\\v{s}/g, "\u0161"); // LATIN SMALL LETTER S WITH CARON
    value = value.replace(/\\c{T}/g, "\u0162"); // LATIN CAPITAL LETTER T WITH CEDILLA
    value = value.replace(/\\c{t}/g, "\u0163"); // LATIN SMALL LETTER T WITH CEDILLA
    value = value.replace(/\\v{T}/g, "\u0164"); // LATIN CAPITAL LETTER T WITH CARON
    value = value.replace(/\\v{t}/g, "\u0165"); // LATIN SMALL LETTER T WITH CARON
    value = value.replace(/\\~{U}/g, "\u0168"); // LATIN CAPITAL LETTER U WITH TILDE
    value = value.replace(/\\~{u}/g, "\u0169"); // LATIN SMALL LETTER U WITH TILDE
    value = value.replace(/\\={U}/g, "\u016A"); // LATIN CAPITAL LETTER U WITH MACRON
    value = value.replace(/\\={u}/g, "\u016B"); // LATIN SMALL LETTER U WITH MACRON
    value = value.replace(/\\u{U}/g, "\u016C"); // LATIN CAPITAL LETTER U WITH BREVE
    value = value.replace(/\\u{u}/g, "\u016D"); // LATIN SMALL LETTER U WITH BREVE
    value = value.replace(/\\H{U}/g, "\u0170"); // LATIN CAPITAL LETTER U WITH DOUBLE ACUTE
    value = value.replace(/\\H{u}/g, "\u0171"); // LATIN SMALL LETTER U WITH DOUBLE ACUTE
    value = value.replace(/\\k{U}/g, "\u0172"); // LATIN CAPITAL LETTER U WITH OGONEK
    value = value.replace(/\\k{u}/g, "\u0173"); // LATIN SMALL LETTER U WITH OGONEK
    value = value.replace(/\\^{W}/g, "\u0174"); // LATIN CAPITAL LETTER W WITH CIRCUMFLEX
    value = value.replace(/\\^{w}/g, "\u0175"); // LATIN SMALL LETTER W WITH CIRCUMFLEX
    value = value.replace(/\\^{Y}/g, "\u0176"); // LATIN CAPITAL LETTER Y WITH CIRCUMFLEX
    value = value.replace(/\\^{y}/g, "\u0177"); // LATIN SMALL LETTER Y WITH CIRCUMFLEX
    value = value.replace(/\\\"{Y}/g, "\u0178"); // LATIN CAPITAL LETTER Y WITH DIAERESIS
    value = value.replace(/\\'{Z}/g, "\u0179"); // LATIN CAPITAL LETTER Z WITH ACUTE
    value = value.replace(/\\'{z}/g, "\u017A"); // LATIN SMALL LETTER Z WITH ACUTE
    value = value.replace(/\\.{Z}/g, "\u017B"); // LATIN CAPITAL LETTER Z WITH DOT ABOVE
    value = value.replace(/\\.{z}/g, "\u017C"); // LATIN SMALL LETTER Z WITH DOT ABOVE
    value = value.replace(/\\v{Z}/g, "\u017D"); // LATIN CAPITAL LETTER Z WITH CARON
    value = value.replace(/\\v{z}/g, "\u017E"); // LATIN SMALL LETTER Z WITH CARON
    value = value.replace(/\\v{A}/g, "\u01CD"); // LATIN CAPITAL LETTER A WITH CARON
    value = value.replace(/\\v{a}/g, "\u01CE"); // LATIN SMALL LETTER A WITH CARON
    value = value.replace(/\\v{I}/g, "\u01CF"); // LATIN CAPITAL LETTER I WITH CARON
    value = value.replace(/\\v{i}/g, "\u01D0"); // LATIN SMALL LETTER I WITH CARON
    value = value.replace(/\\v{O}/g, "\u01D1"); // LATIN CAPITAL LETTER O WITH CARON
    value = value.replace(/\\v{o}/g, "\u01D2"); // LATIN SMALL LETTER O WITH CARON
    value = value.replace(/\\v{U}/g, "\u01D3"); // LATIN CAPITAL LETTER U WITH CARON
    value = value.replace(/\\v{u}/g, "\u01D4"); // LATIN SMALL LETTER U WITH CARON
    value = value.replace(/\\v{G}/g, "\u01E6"); // LATIN CAPITAL LETTER G WITH CARON
    value = value.replace(/\\v{g}/g, "\u01E7"); // LATIN SMALL LETTER G WITH CARON
    value = value.replace(/\\v{K}/g, "\u01E8"); // LATIN CAPITAL LETTER K WITH CARON
    value = value.replace(/\\v{k}/g, "\u01E9"); // LATIN SMALL LETTER K WITH CARON
    value = value.replace(/\\k{O}/g, "\u01EA"); // LATIN CAPITAL LETTER O WITH OGONEK
    value = value.replace(/\\k{o}/g, "\u01EB"); // LATIN SMALL LETTER O WITH OGONEK
    value = value.replace(/\\v{j}/g, "\u01F0"); // LATIN SMALL LETTER J WITH CARON
    value = value.replace(/\\'{G}/g, "\u01F4"); // LATIN CAPITAL LETTER G WITH ACUTE
    value = value.replace(/\\'{g}/g, "\u01F5"); // LATIN SMALL LETTER G WITH ACUTE
    value = value.replace(/\\.{B}/g, "\u1E02"); // LATIN CAPITAL LETTER B WITH DOT ABOVE
    value = value.replace(/\\.{b}/g, "\u1E03"); // LATIN SMALL LETTER B WITH DOT ABOVE
    value = value.replace(/\\d{B}/g, "\u1E04"); // LATIN CAPITAL LETTER B WITH DOT BELOW
    value = value.replace(/\\d{b}/g, "\u1E05"); // LATIN SMALL LETTER B WITH DOT BELOW
    value = value.replace(/\\b{B}/g, "\u1E06"); // LATIN CAPITAL LETTER B WITH LINE BELOW
    value = value.replace(/\\b{b}/g, "\u1E07"); // LATIN SMALL LETTER B WITH LINE BELOW
    value = value.replace(/\\.{D}/g, "\u1E0A"); // LATIN CAPITAL LETTER D WITH DOT ABOVE
    value = value.replace(/\\.{d}/g, "\u1E0B"); // LATIN SMALL LETTER D WITH DOT ABOVE
    value = value.replace(/\\d{D}/g, "\u1E0C"); // LATIN CAPITAL LETTER D WITH DOT BELOW
    value = value.replace(/\\d{d}/g, "\u1E0D"); // LATIN SMALL LETTER D WITH DOT BELOW
    value = value.replace(/\\b{D}/g, "\u1E0E"); // LATIN CAPITAL LETTER D WITH LINE BELOW
    value = value.replace(/\\b{d}/g, "\u1E0F"); // LATIN SMALL LETTER D WITH LINE BELOW
    value = value.replace(/\\c{D}/g, "\u1E10"); // LATIN CAPITAL LETTER D WITH CEDILLA
    value = value.replace(/\\c{d}/g, "\u1E11"); // LATIN SMALL LETTER D WITH CEDILLA
    value = value.replace(/\\.{F}/g, "\u1E1E"); // LATIN CAPITAL LETTER F WITH DOT ABOVE
    value = value.replace(/\\.{f}/g, "\u1E1F"); // LATIN SMALL LETTER F WITH DOT ABOVE
    value = value.replace(/\\={G}/g, "\u1E20"); // LATIN CAPITAL LETTER G WITH MACRON
    value = value.replace(/\\={g}/g, "\u1E21"); // LATIN SMALL LETTER G WITH MACRON
    value = value.replace(/\\.{H}/g, "\u1E22"); // LATIN CAPITAL LETTER H WITH DOT ABOVE
    value = value.replace(/\\.{h}/g, "\u1E23"); // LATIN SMALL LETTER H WITH DOT ABOVE
    value = value.replace(/\\d{H}/g, "\u1E24"); // LATIN CAPITAL LETTER H WITH DOT BELOW
    value = value.replace(/\\d{h}/g, "\u1E25"); // LATIN SMALL LETTER H WITH DOT BELOW
    value = value.replace(/\\\"{H}/g, "\u1E26"); // LATIN CAPITAL LETTER H WITH DIAERESIS
    value = value.replace(/\\\"{h}/g, "\u1E27"); // LATIN SMALL LETTER H WITH DIAERESIS
    value = value.replace(/\\c{H}/g, "\u1E28"); // LATIN CAPITAL LETTER H WITH CEDILLA
    value = value.replace(/\\c{h}/g, "\u1E29"); // LATIN SMALL LETTER H WITH CEDILLA
    value = value.replace(/\\'{K}/g, "\u1E30"); // LATIN CAPITAL LETTER K WITH ACUTE
    value = value.replace(/\\'{k}/g, "\u1E31"); // LATIN SMALL LETTER K WITH ACUTE
    value = value.replace(/\\d{K}/g, "\u1E32"); // LATIN CAPITAL LETTER K WITH DOT BELOW
    value = value.replace(/\\d{k}/g, "\u1E33"); // LATIN SMALL LETTER K WITH DOT BELOW
    value = value.replace(/\\b{K}/g, "\u1E34"); // LATIN CAPITAL LETTER K WITH LINE BELOW
    value = value.replace(/\\b{k}/g, "\u1E35"); // LATIN SMALL LETTER K WITH LINE BELOW
    value = value.replace(/\\d{L}/g, "\u1E36"); // LATIN CAPITAL LETTER L WITH DOT BELOW
    value = value.replace(/\\d{l}/g, "\u1E37"); // LATIN SMALL LETTER L WITH DOT BELOW
    value = value.replace(/\\b{L}/g, "\u1E3A"); // LATIN CAPITAL LETTER L WITH LINE BELOW
    value = value.replace(/\\b{l}/g, "\u1E3B"); // LATIN SMALL LETTER L WITH LINE BELOW
    value = value.replace(/\\'{M}/g, "\u1E3E"); // LATIN CAPITAL LETTER M WITH ACUTE
    value = value.replace(/\\'{m}/g, "\u1E3F"); // LATIN SMALL LETTER M WITH ACUTE
    value = value.replace(/\\.{M}/g, "\u1E40"); // LATIN CAPITAL LETTER M WITH DOT ABOVE
    value = value.replace(/\\.{m}/g, "\u1E41"); // LATIN SMALL LETTER M WITH DOT ABOVE
    value = value.replace(/\\d{M}/g, "\u1E42"); // LATIN CAPITAL LETTER M WITH DOT BELOW
    value = value.replace(/\\d{m}/g, "\u1E43"); // LATIN SMALL LETTER M WITH DOT BELOW
    value = value.replace(/\\.{N}/g, "\u1E44"); // LATIN CAPITAL LETTER N WITH DOT ABOVE
    value = value.replace(/\\.{n}/g, "\u1E45"); // LATIN SMALL LETTER N WITH DOT ABOVE
    value = value.replace(/\\d{N}/g, "\u1E46"); // LATIN CAPITAL LETTER N WITH DOT BELOW
    value = value.replace(/\\d{n}/g, "\u1E47"); // LATIN SMALL LETTER N WITH DOT BELOW
    value = value.replace(/\\b{N}/g, "\u1E48"); // LATIN CAPITAL LETTER N WITH LINE BELOW
    value = value.replace(/\\b{n}/g, "\u1E49"); // LATIN SMALL LETTER N WITH LINE BELOW
    value = value.replace(/\\'{P}/g, "\u1E54"); // LATIN CAPITAL LETTER P WITH ACUTE
    value = value.replace(/\\'{p}/g, "\u1E55"); // LATIN SMALL LETTER P WITH ACUTE
    value = value.replace(/\\.{P}/g, "\u1E56"); // LATIN CAPITAL LETTER P WITH DOT ABOVE
    value = value.replace(/\\.{p}/g, "\u1E57"); // LATIN SMALL LETTER P WITH DOT ABOVE
    value = value.replace(/\\.{R}/g, "\u1E58"); // LATIN CAPITAL LETTER R WITH DOT ABOVE
    value = value.replace(/\\.{r}/g, "\u1E59"); // LATIN SMALL LETTER R WITH DOT ABOVE
    value = value.replace(/\\d{R}/g, "\u1E5A"); // LATIN CAPITAL LETTER R WITH DOT BELOW
    value = value.replace(/\\d{r}/g, "\u1E5B"); // LATIN SMALL LETTER R WITH DOT BELOW
    value = value.replace(/\\b{R}/g, "\u1E5E"); // LATIN CAPITAL LETTER R WITH LINE BELOW
    value = value.replace(/\\b{r}/g, "\u1E5F"); // LATIN SMALL LETTER R WITH LINE BELOW
    value = value.replace(/\\.{S}/g, "\u1E60"); // LATIN CAPITAL LETTER S WITH DOT ABOVE
    value = value.replace(/\\.{s}/g, "\u1E61"); // LATIN SMALL LETTER S WITH DOT ABOVE
    value = value.replace(/\\d{S}/g, "\u1E62"); // LATIN CAPITAL LETTER S WITH DOT BELOW
    value = value.replace(/\\d{s}/g, "\u1E63"); // LATIN SMALL LETTER S WITH DOT BELOW
    value = value.replace(/\\.{T}/g, "\u1E6A"); // LATIN CAPITAL LETTER T WITH DOT ABOVE
    value = value.replace(/\\.{t}/g, "\u1E6B"); // LATIN SMALL LETTER T WITH DOT ABOVE
    value = value.replace(/\\d{T}/g, "\u1E6C"); // LATIN CAPITAL LETTER T WITH DOT BELOW
    value = value.replace(/\\d{t}/g, "\u1E6D"); // LATIN SMALL LETTER T WITH DOT BELOW
    value = value.replace(/\\b{T}/g, "\u1E6E"); // LATIN CAPITAL LETTER T WITH LINE BELOW
    value = value.replace(/\\b{t}/g, "\u1E6F"); // LATIN SMALL LETTER T WITH LINE BELOW
    value = value.replace(/\\~{V}/g, "\u1E7C"); // LATIN CAPITAL LETTER V WITH TILDE
    value = value.replace(/\\~{v}/g, "\u1E7D"); // LATIN SMALL LETTER V WITH TILDE
    value = value.replace(/\\d{V}/g, "\u1E7E"); // LATIN CAPITAL LETTER V WITH DOT BELOW
    value = value.replace(/\\d{v}/g, "\u1E7F"); // LATIN SMALL LETTER V WITH DOT BELOW
    value = value.replace(/\\`{W}/g, "\u1E80"); // LATIN CAPITAL LETTER W WITH GRAVE
    value = value.replace(/\\`{w}/g, "\u1E81"); // LATIN SMALL LETTER W WITH GRAVE
    value = value.replace(/\\'{W}/g, "\u1E82"); // LATIN CAPITAL LETTER W WITH ACUTE
    value = value.replace(/\\'{w}/g, "\u1E83"); // LATIN SMALL LETTER W WITH ACUTE
    value = value.replace(/\\\"{W}/g, "\u1E84"); // LATIN CAPITAL LETTER W WITH DIAERESIS
    value = value.replace(/\\\"{w}/g, "\u1E85"); // LATIN SMALL LETTER W WITH DIAERESIS
    value = value.replace(/\\.{W}/g, "\u1E86"); // LATIN CAPITAL LETTER W WITH DOT ABOVE
    value = value.replace(/\\.{w}/g, "\u1E87"); // LATIN SMALL LETTER W WITH DOT ABOVE
    value = value.replace(/\\d{W}/g, "\u1E88"); // LATIN CAPITAL LETTER W WITH DOT BELOW
    value = value.replace(/\\d{w}/g, "\u1E89"); // LATIN SMALL LETTER W WITH DOT BELOW
    value = value.replace(/\\.{X}/g, "\u1E8A"); // LATIN CAPITAL LETTER X WITH DOT ABOVE
    value = value.replace(/\\.{x}/g, "\u1E8B"); // LATIN SMALL LETTER X WITH DOT ABOVE
    value = value.replace(/\\\"{X}/g, "\u1E8C"); // LATIN CAPITAL LETTER X WITH DIAERESIS
    value = value.replace(/\\\"{x}/g, "\u1E8D"); // LATIN SMALL LETTER X WITH DIAERESIS
    value = value.replace(/\\.{Y}/g, "\u1E8E"); // LATIN CAPITAL LETTER Y WITH DOT ABOVE
    value = value.replace(/\\.{y}/g, "\u1E8F"); // LATIN SMALL LETTER Y WITH DOT ABOVE
    value = value.replace(/\\^{Z}/g, "\u1E90"); // LATIN CAPITAL LETTER Z WITH CIRCUMFLEX
    value = value.replace(/\\^{z}/g, "\u1E91"); // LATIN SMALL LETTER Z WITH CIRCUMFLEX
    value = value.replace(/\\d{Z}/g, "\u1E92"); // LATIN CAPITAL LETTER Z WITH DOT BELOW
    value = value.replace(/\\d{z}/g, "\u1E93"); // LATIN SMALL LETTER Z WITH DOT BELOW
    value = value.replace(/\\b{Z}/g, "\u1E94"); // LATIN CAPITAL LETTER Z WITH LINE BELOW
    value = value.replace(/\\b{z}/g, "\u1E95"); // LATIN SMALL LETTER Z WITH LINE BELOW
    value = value.replace(/\\b{h}/g, "\u1E96"); // LATIN SMALL LETTER H WITH LINE BELOW
    value = value.replace(/\\\"{t}/g, "\u1E97"); // LATIN SMALL LETTER T WITH DIAERESIS
    value = value.replace(/\\d{A}/g, "\u1EA0"); // LATIN CAPITAL LETTER A WITH DOT BELOW
    value = value.replace(/\\d{a}/g, "\u1EA1"); // LATIN SMALL LETTER A WITH DOT BELOW
    value = value.replace(/\\d{E}/g, "\u1EB8"); // LATIN CAPITAL LETTER E WITH DOT BELOW
    value = value.replace(/\\d{e}/g, "\u1EB9"); // LATIN SMALL LETTER E WITH DOT BELOW
    value = value.replace(/\\~{E}/g, "\u1EBC"); // LATIN CAPITAL LETTER E WITH TILDE
    value = value.replace(/\\~{e}/g, "\u1EBD"); // LATIN SMALL LETTER E WITH TILDE
    value = value.replace(/\\d{I}/g, "\u1ECA"); // LATIN CAPITAL LETTER I WITH DOT BELOW
    value = value.replace(/\\d{i}/g, "\u1ECB"); // LATIN SMALL LETTER I WITH DOT BELOW
    value = value.replace(/\\d{O}/g, "\u1ECC"); // LATIN CAPITAL LETTER O WITH DOT BELOW
    value = value.replace(/\\d{o}/g, "\u1ECD"); // LATIN SMALL LETTER O WITH DOT BELOW
    value = value.replace(/\\d{U}/g, "\u1EE4"); // LATIN CAPITAL LETTER U WITH DOT BELOW
    value = value.replace(/\\d{u}/g, "\u1EE5"); // LATIN SMALL LETTER U WITH DOT BELOW
    value = value.replace(/\\`{Y}/g, "\u1EF2"); // LATIN CAPITAL LETTER Y WITH GRAVE
    value = value.replace(/\\`{y}/g, "\u1EF3"); // LATIN SMALL LETTER Y WITH GRAVE
    value = value.replace(/\\d{Y}/g, "\u1EF4"); // LATIN CAPITAL LETTER Y WITH DOT BELOW
    value = value.replace(/\\d{y}/g, "\u1EF5"); // LATIN SMALL LETTER Y WITH DOT BELOW
    // value = value.replace(/\\~{Y}/g, "\u1EF8"); // LATIN CAPITAL LETTER Y WITH TILDE
    // value = value.replace(/\\~{y}/g, "\u1EF9"); // LATIN SMALL LETTER Y WITH TILDE
    // value = value.replace(/\\~{}/g, "\u223C"); // TILDE OPERATOR
    // value = value.replace(/~/g, "\u00A0" // NO-BREAK SPACE

    // DEFAULT (substitutes everything else)
    value = value.replace(/\{(.*?)\}/g, '$1');
    return value;
  }
  
  this.displayBibtex2 = function(i, o) {
    var b = new BibtexParser();
    b.setInput(i);
    b.bibtex();

    var e = b.getEntries();
    var old = o.find("*");
  
    for (var item in e) {
      var tpl = $(".bibtex_template").clone().removeClass('bibtex_template');
      tpl.addClass("unused");
      
      for (var key in e[item]) {
      
        var fields = tpl.find("." + key.toLowerCase());
        for (var i = 0; i < fields.length; i++) {
          var f = $(fields[i]);
          f.removeClass("unused");
          var value = this.fixValue(e[item][key]);
          if (f.is("a")) {
            f.attr("href", value);
          } else {
            var currentHTML = f.html() || "";
            if (currentHTML.match("%")) {
              // "complex" template field
              f.html(currentHTML.replace("%", value));
            } else {
              // simple field
              f.html(value);
            }
          }
        }
      }
    
      var emptyFields = tpl.find("span .unused");
      emptyFields.each(function (key,f) {
        if (f.innerHTML.match("%")) {
          f.innerHTML = "";
        }
      });
    
      o.append(tpl);
      tpl.show();
    }
    
    old.remove();
  }


  this.displayBibtex = function(input, output) {
    // parse bibtex input
    var b = new BibtexParser();
    b.setInput(input);
    b.bibtex();
    
    // save old entries to remove them later
    var old = output.find("*");    

    // iterate over bibTeX entries
    var entries = b.getEntries();
    for (var entryKey in entries) {
      var entry = entries[entryKey];
      
      // find template
      var tpl = $(".bibtex_template").clone().removeClass('bibtex_template');
      
      // find all keys in the entry
      var keys = [];
      for (var key in entry) {
        keys.push(key.toUpperCase());
      }
      
      // find all ifs and check them
      var removed = false;
      do {
        // find next if
        var conds = tpl.find(".if");
        if (conds.length == 0) {
          break;
        }
        
        // check if
        var cond = conds.first();
        cond.removeClass("if");
        var ifTrue = true;
        var classList = cond.attr('class').split(' ');
        $.each( classList, function(index, cls){
          if(keys.indexOf(cls.toUpperCase()) < 0) {
            ifTrue = false;
          }
          cond.removeClass(cls);
        });
        
        // remove false ifs
        if (!ifTrue) {
          cond.remove();
        }
      } while (true);
      
      // fill in remaining fields 
      for (var index in keys) {
        var key = keys[index];
        var value = entry[key] || "";
        tpl.find("span:not(a)." + key.toLowerCase()).html(this.fixValue(value));
        tpl.find("a." + key.toLowerCase()).attr('href', this.fixValue(value));
      }
      
      output.append(tpl);
      tpl.show();
    }
    
    // remove old entries
    old.remove();
  }

}

function bibtex_js_draw() {
  $(".bibtex_template").hide();
  (new BibtexDisplay()).displayBibtex($("#bibtex_input").val(), $("#bibtex_display"));
}

// (LMC) LOAD BIBTEX FILE (no longer needed, with flask
$(document).ready( function() {
//   $("#bibtex_input").load("{{ url_for('static', filename='mybib.bib') }}", bibtex_js_draw);
    bibtex_js_draw();
    alert("test");
});


// check whether or not jquery is present
if (typeof jQuery == 'undefined') {  
  // an interesting idea is loading jquery here. this might be added
  // in the future.
  alert("Please include jquery in all pages using bibtex_js!");
} else {
  // draw bibtex when loaded
  $(document).ready(function () {
    // check for template, add default
    if ($(".bibtex_template").length == 0) {
	alert("test_2");
	$("body").append("<div class=\"bibtex_template\">"+
        "<div class=\"if author\" style=\"font-weight: bold;\">\n"+
          "<span class=\"author\"></span>\n"+  
          "<span class=\"if year\">\n"+    
            "(<span class=\"year\"></span>) \n </span>\n"+
          "<span class=\"if url\" style=\"margin-left: 10px\">\n"+    
            "<a class=\"url\" style=\"color: #C0C0C0; font-size:75%\">(view online)</a>\n"+  
          "</span>\n</div>\n"+
        "<div style=\"margin-left: 10px; margin-bottom:5px;\">\n"+  

        "<span class=\"title\"></span>.\n"+

        "<span class=\"if journal\">\n" +
          "<span class=\"journal\"></span>" +
              "<span class=\"if volume\">" +
              ", (<span class=\"volume\"></span>)" +
              "</span>" +
              "<span class=\"if number\">" +
              ":<span class=\"number\"></span>" +
              "</span>" +
        ".</span>\n" +


        "<span class=\"if booktitle\">\n" +
        "  <span class=\"booktitle\"></span>.\n" +
        "</span>\n" +

        "<span class=\"if organization\">\n" +
        "  <span class=\"organization\"></span>.\n" +
        "</span>\n" +

        "<span class=\"if publisher\">\n" +
        "  <span class=\"publisher\"></span>.\n" +
        "</span>\n" +

        "<span class=\"if address\">\n" +
        "  <span class=\"address\"></span>.\n" +
        "</span>\n" +


        "</div>"+

      "</div>");
    }

    bibtex_js_draw();
  });
}
