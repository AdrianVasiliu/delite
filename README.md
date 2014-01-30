# Purpose

Quick experiment about replacing the usages of Dojo Core by jQuery AMD.

# Contents

This branch contains a copy of delite's current master, with the following differences:

* delite/Scrollable.js: modified to use jQuery AMD instead of Dojo Core modules.

* delite/ScrollableContainer.js and delite/tests/ScrollableContainer.html added to allow
the testing of the delite/Scrollable mixin. (This stuff is going to be in deliteful, but to avoid spreading this experiment over 
both delite and deliteful I preferred simply copying them here.)

* delite/Scrollable/themes/**: modified to add CSS as replacement of a 
dojo-core API (dom.setSelectable) with no jQuery equivalent (nowadays).

* delite/tests/boilerplate.js: added loader's packages directive for Sizzle 
(needed by jQuery).

The full list of differences: https://github.com/AdrianVasiliu/delite/commit/8476229adf564a0bbef52f321bfdddf3c19cfa49. 

# How to test

* Clone https://github.com/AdrianVasiliu/delite.git and switch to its scrollable-jQuery branch.
* Clone https://github.com/jQuery/jQuery.git as sibling of delite.
* Run delite/tests/ScrollableContainer.html. 

# Conclusion

* The few Dojo Core API's used in delite/Scrollable have a straightforward jQuery equivalent, with 
the exception (in this experiment) of dojo/dom's setSelectable() which can be replaced with plain JS/CSS. 
* The use of jQuery animation/effects instead of dojo/_base/fx-based animation gives very similar results.
