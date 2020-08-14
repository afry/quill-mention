![Quill Mention](docs/static/quill-mention.png "Quill Mention")

# Quill Mention

[![npm version](https://badge.fury.io/js/quill-mention.svg)](https://badge.fury.io/js/quill-mention)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Quill Mention is a module to provide @mentions or #hashtag functionality for the [Quill](https://quilljs.com/) rich text editor.

## Demo

https://afry.github.io/quill-mention/

![Mention Demo GIF](docs/static/mention.gif "Mention Demo GIF")

## Getting Started

### Install

Install with npm:

```bash
npm install quill-mention --save
```

Install with [Yarn](https://yarnpkg.com/en/):

```bash
yarn add quill-mention
```

### Import package

```javascript
import "quill-mention";
// or
require("quill-mention");
```

Importing quill-mention automagically adds it to Quill modules.

Now you only need to pass quill-mention config to quill.

### Example

```javascript
import "quill-mention";

const atValues = [
  { id: 1, value: "Fredrik Sundqvist" },
  { id: 2, value: "Patrik Sjölin" }
];
const hashValues = [
  { id: 3, value: "Fredrik Sundqvist 2" },
  { id: 4, value: "Patrik Sjölin 2" }
];
const quill = new Quill("#editor", {
  modules: {
    mention: {
      allowedChars: /^[A-Za-z\sÅÄÖåäö]*$/,
      mentionDenotationChars: ["@", "#"],
      source: function(searchTerm, renderList, mentionChar) {
        let values;

        if (mentionChar === "@") {
          values = atValues;
        } else {
          values = hashValues;
        }

        if (searchTerm.length === 0) {
          renderList(values, searchTerm);
        } else {
          const matches = [];
          for (let i = 0; i < values.length; i++)
            if (
              ~values[i].value.toLowerCase().indexOf(searchTerm.toLowerCase())
            )
              matches.push(values[i]);
          renderList(matches, searchTerm);
        }
      }
    }
  }
});
```

### Async example

```javascript
async function suggestPeople(searchTerm) {
  const allPeople = [
    {
      id: 1,
      value: "Fredrik Sundqvist"
    },
    {
      id: 2,
      value: "Patrik Sjölin"
    }
  ];
  return allPeople.filter(person => person.value.includes(searchTerm));
}

const quill = new Quill("#editor", {
  modules: {
    mention: {
      allowedChars: /^[A-Za-z\sÅÄÖåäö]*$/,
      mentionDenotationChars: ["@", "#"],
      source: async function(searchTerm, renderList) {
        const matchedPeople = await suggestPeople(searchTerm);
        renderList(matchedPeople);
      }
    }
  }
});
```

**Note**: if you whitelist quill formats via ["formats" option](https://quilljs.com/docs/configuration/#formats),
you need to add the mention format (default: "mention") there. Another way quill-mention won't work.
Here's an example with whitelisted formats:

```javascript
const quill = new Quill("#editor", {
  formats: ["bold", "italic", "mention"],
  // note "mention" format above
  modules: {
    mention: {
      allowedChars: /^[A-Za-z\sÅÄÖåäö]*$/,
      mentionDenotationChars: ["@", "#"],
      source: function(searchTerm, renderList, mentionChar) {
        // some source implementation
      }
    }
  }
});
```

### Settings

| Property                                      | Default                                               | Description                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| --------------------------------------------- | ----------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `source(searchTerm, renderList, mentionChar)` | `null`                                                | Required callback function to handle the search term and connect it to a data source for matches. The data source can be a local source or an AJAX request. The callback should call `renderList(matches, searchTerm);` with matches of JSON Objects in an array to show the result for the user. The JSON Objects should have `id` and `value` but can also have other values to be used in `renderItem` for custom display.                                                       |
| `renderItem(item, searchTerm)`                | `function`                                            | A function that gives you control over how matches from source are displayed. You can use this function to highlight the search term or change the design with custom HTML.                                                                                                                                                                                                                                                                                                         |
| `allowedChars`                                | `[a-zA-Z0-9_]`                                        | Allowed characters in search term triggering a search request using regular expressions                                                                                                                                                                                                                                                                                                                                                                                             |
| `minChars`                                    | `0`                                                   | Minimum number of characters after the @ symbol triggering a search request                                                                                                                                                                                                                                                                                                                                                                                                         |
| `maxChars`                                    | `31`                                                  | Maximum number of characters after the @ symbol triggering a search request                                                                                                                                                                                                                                                                                                                                                                                                         |
| `offsetTop`                                   | `2`                                                   | Additional top offset of the mention container position                                                                                                                                                                                                                                                                                                                                                                                                                             |
| `offsetLeft`                                  | `0`                                                   | Additional left offset of the mention container position                                                                                                                                                                                                                                                                                                                                                                                                                            |
| `mentionDenotationChars`                      | `["@"]`                                               | Specifies which characters will cause the mention autocomplete to open                                                                                                                                                                                                                                                                                                                                                                                                              |
| `isolateCharacter`                            | `false`                                               | Whether or not the denotation character(s) should be isolated. For example, to avoid mentioning in an email.                                                                                                                                                                                                                                                                                                                                                                        |
| `fixMentionsToQuill`                          | `false`                                               | When set to true, the mentions menu will be rendered above or below the quill container. Otherwise, the mentions menu will track the denotation character(s);                                                                                                                                                                                                                                                                                                                       |
| `showDenotationChar`                          | `true`                                                | Whether to show the used denotation character in the mention item or not                                                                                                                                                                                                                                                                                                                                                                                                            |
| `defaultMenuOrientation`                      | `'bottom'`                                            | Options are `'bottom'` and `'top'`. Determines what the default orientation of the menu will be. Quill-mention will attempt to render the menu either above or below the editor. If `'top'` is provided as a value, and there is not enough space above the editor, the menu will be rendered below. Vice versa, if there is not enough space below the editor, and `'bottom'` is provided as a value (or no value is provided at all), the menu will be rendered above the editor. |
| `blotName`                                    | `'mention'`                                           | The name of the [Quill Blot](https://github.com/quilljs/parchment#blots) to be used for inserted mentions. A default implementation is provided named 'mention', which may be overidden with a custom blot. The blotName can also be specified via the `onSelect` method.
| `dataAttributes`                              | `['id', 'value', 'denotationChar', 'link', 'target']` | A list of data values you wish to be passed from your list data to the html node. (`id, value, denotationChar, link, target` are included by default).                                                                                                                                                                                                                                                                                                                              |
| `onOpen`                                      | `function`                                            | Callback when mention dropdown is open.                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| `onClose`                                     | `function`                                            | Callback when mention dropdown is closed.                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| `onSelect(item, insertItem)`                  | `function`                                            | Callback for a selected item. The callback should call `insertItem(item, blotName?)` to insert the `item` to the editor. This makes async requests possible. `insertItem` accepts an optional `blotName` parameter, which can be used to vary the Quill Blot for different items. If no `blotName` is provided, the default `blotName` will be used.                                                                                                                                                                                                                                                                                                                         |
| `linkTarget`                                  | `'_blank'`                                            | Link target for mentions with a link                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| `listItemClass`                               | `'ql-mention-list-item'`                              | Style class to be used for list items (may be null)                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| `mentionContainerClass`                       | `'ql-mention-list-container'`                         | Style class to be used for the mention list container (may be null)                                                                                                                                                                                                                                                                                                                                                                                                                 |
| `mentionListClass`                            | `'ql-mention-list'`                                   | Style class to be used for the mention list (may be null)                                                                                                                                                                                                                                                                                                                                                                                                                           |
| `spaceAfterInsert`                            | `true`                                                | Whether or not insert 1 space after mention block in text                                                                                                                                                                                                                                                                                                                                                                                                                           |

### Styling

To allow styling based on the menu orientation, a class is added depending on the orientation and the `mentionContainerClass` option. By default this will be `ql-mention-list-container-bottom` or `ql-mention-list-container-top`.

## Authors

**Fredrik Sundqvist** ([MadSpindel](https://github.com/MadSpindel))

See also the list of [contributors](https://github.com/afry/quill-mention/contributors) who participated in this project.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details
