(function(){
Template.body.addContent((function() {
  var view = this;
  return "";
}));
Meteor.startup(Template.body.renderToDocument);

Template.__checkName("hello");
Template["hello"] = new Template("Template.hello", (function() {
  var view = this;
  return [ HTML.Raw("<h1>Hello World!</h1>\n  "), Blaze.View(function() {
    return Spacebars.mustache(view.lookup("greeting"));
  }), HTML.Raw('\n  <input type="button" value="Click">\n  <input type="text">\n  '), HTML.P("You clicked ", Blaze.View(function() {
    return Spacebars.mustache(view.lookup("counter"));
  }), " times."), HTML.Raw('\n\n\n  <button id="waitForDOM">Click to add a new element.</button>\n\n  <div id="waitUntilGone">\n    <div id="removeChildTestDiv">Click to remove this element.</div>\n  </div>\n\n  <div id="getText"><h3>Get text.</h3></div>\n\n  <input id="getValue" type="text" value="Get value.">\n\n  <div id="getClass" class="myClass">Get class.</div>\n  <div id="noClass">Get class.</div>\n\n  <input id="setValue" type="text">\n\n  '), HTML.TEXTAREA({
    id: "focus",
    type: "text",
    value: "Click to focus this element."
  }), "\n  ", HTML.TEXTAREA({
    id: "blur",
    type: "text",
    value: "Click in then out to blur this element."
  }), HTML.Raw('\n\n  <!--checkIfVisible-->\n  <div id="visibleElement">Visible Element.</div>\n  <div id="hiddenElement" style="display:none">Hidden Element.</div>\n  <div style="display:none"><ul><li id="hiddenChild"><p>Hidden Descendant.</p></li></ul></div>\n  <div><ul><li><p id="visibleChild">Visible Descendant.</p></li></ul></div>\n  <div id="fixedPositionDiv" style="position:fixed;top:16px;right:0px;">Fixed position.</div>\n  <div id="absolutePositionDiv" style="position:absolute;top:0px;right:4px;">Absolute position.</div>\n  <div id="fixedPositionDivHidden" style="position:fixed;top:16px;right:0px;display:none;">Fixed position hidden.</div>\n  <div id="absolutePositionDivHidden" style="position:absolute;top:0px;right:4px;display:none;">Absolute position hidden.</div>\n  \n  <!--waitUntilNotVisible-->\n  <div id="waitUntilNotVisible">Click to hide this element.</div>\n  <button id="hideParentElement">Click to hide next div.</button>\n  <div id="waitUntilNotVisibleParent"><ul><li><p id="visibleChild2">Visible Descendant 2.</p></li></ul></div>') ];
}));

Template.__checkName("testRouteTemplate");
Template["testRouteTemplate"] = new Template("Template.testRouteTemplate", (function() {
  var view = this;
  return HTML.Raw('<div id="testRouteDiv"><h1>Testing Iron Router WaitForRoute Helper.</h1></div>');
}));

})();
