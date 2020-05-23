interface highlightInput {
    selector: string;
    searchTerm: string;
    highlightClass?: string;
    highlightStyle?: object;
    caseSensitive?: boolean;
    debounceTime?: number;
}

const highlightClassIdentifier = 'hlJS' + Math.round(Math.random() * 1000);

class HighlightJS implements highlightInput {
    previousKeyStrokeMilliSecs = 0;
    currentSearchTerm = '';
    selector = '';
    searchTerm = '';
    sanitizedSearchTerm = '';
    highlightTag: HTMLSpanElement | null = null;
    caseSensitive = false;
    debounceTime = 50;
    shortcutEventListener: any;
    isShortcutEventListener = false;
    _count = 0;
    validInputData = true;
    specialCharacters = '`~!@#$%^&*()_-=+[{]}\\|;:\'"<>/?.';

    constructor() {}

    get count() {
        return this._count;
    }

    disableBrowserShortcutForFind(disable = true) {
        if (disable && !this.isShortcutEventListener) {
            this.shortcutEventListener = window.addEventListener('keydown', function (event) {
                if (event.code === 'F3' || ((event.ctrlKey || event.metaKey) && event.code === 'KeyF')) {
                    event.preventDefault();
                }
            });
            this.isShortcutEventListener = true;
        } else {
            if (this.isShortcutEventListener) {
                window.removeEventListener('keydown', this.shortcutEventListener);
                this.isShortcutEventListener = false;
            }
        }
    }

    highlight(inputObject: highlightInput, recallAfterDebounce = false) {
        if (inputObject.searchTerm === undefined) {
            this.validInputData = false;
            console.error('Search Keyword is missing');
        }
        if (inputObject.selector === undefined) {
            this.validInputData = false;
            console.error('Target reference is missing');
        }
        if (this.validInputData) {
            if (!recallAfterDebounce) {
                this.currentSearchTerm = inputObject.searchTerm;
            }
            if (inputObject.debounceTime !== undefined) {
                this.debounceTime = inputObject.debounceTime;
            }
            const currentMilliSec = new Date().getSeconds() * 1000 + new Date().getMilliseconds();
            const currentKeyStrokeMilliSecs = (currentMilliSec < this.previousKeyStrokeMilliSecs) ? currentMilliSec + 60000 : currentMilliSec;
            if (currentKeyStrokeMilliSecs - this.previousKeyStrokeMilliSecs >= this.debounceTime) {
                if (this.currentSearchTerm === inputObject.searchTerm) {
                    this.searchTerm = inputObject.searchTerm;
                    this.previousKeyStrokeMilliSecs = (currentKeyStrokeMilliSecs > 60000) ? currentKeyStrokeMilliSecs - 60000 : currentKeyStrokeMilliSecs;
                    this.init(inputObject);
                }
            } else {
                setTimeout(() => {
                    this.highlight(inputObject, true);
                }, this.debounceTime);
            }
        }
    }

    init(inputObject: highlightInput) {
        if (inputObject.selector !== undefined) {
            this.selector = (inputObject.selector.length > 1 && inputObject.selector[0] === '#') ? inputObject.selector : 'body';
        }
        const querySelector: HTMLElement | null = document.querySelector(this.selector);
        if (querySelector !== null) {
            const sourceData = querySelector;
            this.resetContent(sourceData);
            if (this.searchTerm !== '') {
                const nodes = sourceData;
                this.highlightTag = document.createElement('span');
                this.highlightTag.classList.add(highlightClassIdentifier);
                if (inputObject.highlightClass !== undefined) {
                    const classData = inputObject.highlightClass.split(' ');
                    for (const clsData of classData) {
                        if (clsData !== '') {
                            this.highlightTag.classList.add(clsData);
                        }
                    }
                }
                if (inputObject.highlightStyle !== undefined) {
                    for (const i of Object.keys(inputObject.highlightStyle)) {
                        // @ts-ignore
                        this.highlightTag.style[i] = inputObject.highlightStyle[i] as string;
                    }
                }
                if (inputObject.highlightStyle === undefined && inputObject.highlightClass === undefined) {
                    this.highlightTag.style.backgroundColor = '#FFF77D';
                }
                if (inputObject.caseSensitive !== undefined && inputObject.caseSensitive) {
                    this.caseSensitive = true;
                }
                this.sanitizeSearchTerm();
                this._count = 0;
                this.currentNode(nodes);
            }
        }
    }

    sanitizeSearchTerm() {
        let finalString = '';
        for (let i = 0; i < this.searchTerm.length; i++) {
            for (let j = 0; j < this.specialCharacters.length; j++) {
                if (this.searchTerm[i] === this.specialCharacters[j]) {
                    finalString += '\\';
                }
            }
            finalString += this.searchTerm[i];
        }
        this.sanitizedSearchTerm = finalString;
    }

    currentNode(nodes: any) {
        if (nodes.children.length > 0) {
            for (const node of nodes.children) {
                this.currentNode(node);
            }
        }
        this.highlightTagContents(nodes);
    }

    highlightTagContents(node: any) {
        let i;
        let nodeData = '';
        for (i = 0; i < node.childNodes.length; i++) {
            const n = node.childNodes[i];
            if (n.nodeValue !== null && this.highlightTag !== null) {
                let textData: string = n.nodeValue;
                while (i + 1 < node.childNodes.length && node.childNodes[i + 1].nodeValue !== null) {
                    textData += node.childNodes[++i].nodeValue;
                }
                const searchResult = (this.caseSensitive) ? textData.search(this.sanitizedSearchTerm) : textData.toLowerCase().search(this.sanitizedSearchTerm.toLowerCase());
                if (searchResult !== -1) {
                    let finalString = '';
                    let position;
                    while (true) {
                        position = (this.caseSensitive) ? textData.indexOf(this.searchTerm) : textData.toLowerCase().indexOf(this.searchTerm.toLowerCase());
                        if (position === -1) {
                            break;
                        }
                        this.highlightTag.textContent = textData.substr(position, this.searchTerm.length);
                        finalString += textData.substr(0, position) + this.highlightTag.outerHTML;
                        textData = textData.substr(position + this.searchTerm.length);
                    }
                    finalString += textData;
                    nodeData += finalString;
                } else {
                    nodeData += textData;
                }
            } else {
                nodeData += n.outerHTML;
            }
        }
        node.innerHTML = nodeData;
    }

    resetContent(sourceData: HTMLElement) {
        const existingHighlightedData: NodeListOf<HTMLElement> = sourceData.querySelectorAll('.' + highlightClassIdentifier);
        existingHighlightedData.forEach((element: HTMLElement) => {
            if (element.textContent !== null) {
                element.replaceWith(element.textContent);
            }
        });
        this._count = 0;
    }
}
let hlJS, hljs, $hlJS, $hljs;
hlJS = hljs = $hlJS = $hljs = new HighlightJS();