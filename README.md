# Purpose

Quick experiment about replacing the usages of Dojo Core by JQuery AMD.

# Contents

This branch contains a copy of delite's current master, with the following differences:

* delite/Scrollable.js: modified to use JQuery AMD instead of Dojo Core modules.

* delite/ScrollableContainer.js and delite/tests/ScrollableContainer.html added to allow
the testing of the delite/Scrollable mixin. (This stuff is going to be in deliteful, but to avoid spreading this experiment over 
both delite and deliteful I preferred simply copying them here.)

* delite/Scrollable/themes/**: modified to add CSS as replacement of a 
dojo-core API (dom.setSelectable) with no JQuery equivalent (nowadays).

* delite/tests/boilerplate.js: added loader's packages directive for Sizzle 
(needed by JQuery).

The full list of differences: https://github.com/AdrianVasiliu/delite/commit/44856feba4ad03f3142a38eea8e03a4643eb2821

# How to test

* Clone https://github.com/AdrianVasiliu/delite.git and switch to its scrollable-jquery branch.
* Clone https://github.com/jquery/jquery.git as sibling of delite.
* Run delite/tests/ScrollableContainer.html. 

# Conclusion

* The few Dojo Core API's used in delite/Scrollable have a straightforward JQuery equivalent, with 
the exception (in this experiment) of dojo/dom's setSelectable() which can be replaced with plain JS/CSS. 
* The use of JQuery animation/effects instead of dojo/_base/fx-based animation gives very similar results.
