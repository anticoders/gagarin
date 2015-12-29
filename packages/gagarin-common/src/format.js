
/**
 * Make an error coming from WebDriver a little more readable.
 */
export function cleanError (err) {
  let message = '';

  if (typeof err === 'string') {
    return new Error(err);

  } else if (typeof err === 'object') {

    if (err.cause) {
      // probably a WebDriver error
      try {
        message = JSON.parse(err.cause.value.message).errorMessage;
      } catch ($) {
        message = err.cause.value.message;
      }
    } else {
      message = err.message || err.toString();
    }
    return new Error(message);
  }
  return new Error(err.toString());
};

/**
 * Creates a nice banner containing the given text.
 *
 * @param {object} options
 */
export function banner (text, options) {

  let marginX     = options.marginX !== undefined ? options.marginX : 2;
  let marginY     = options.marginY !== undefined ? options.marginY : 1;
  let margin      = new Array(marginX+1).join(" ");
  let indent      = options.indent !== undefined ? options.indent :  "  ";
  let maxLength   = 0;
  let linesOfText = text.split('\n');

  let pattern = options.pattern || {
    T: "/", B: "/", TR: "//", BR: "//", TL: "//", BL: "//", R: "//", L: "//"
  };

  linesOfText.forEach(function (line) {
    maxLength = Math.max(maxLength, line.length);
  });

  let top    = pattern.TL + new Array(2 * marginX + maxLength + 1).join(pattern.T) + pattern.TR;
  let empty  = pattern.L  + new Array(2 * marginX + maxLength + 1).join(" ")       + pattern.R;
  let bottom = pattern.BL + new Array(2 * marginX + maxLength + 1).join(pattern.B) + pattern.BR;

  linesOfText = linesOfText.map(function (line) {
    while (line.length < maxLength) {
      line += " ";
    }
    return pattern.L + margin + line + margin + pattern.R;
  });

  // vertical margin
  for (let i=0; i<marginY; i++) {
    linesOfText.unshift(empty);
    linesOfText.push(empty);
  }

  // top and bottom lines
  linesOfText.unshift(top);
  linesOfText.push(bottom);

  return linesOfText.map(function (line) {
    return indent + line;
  }).join('\n');
};


