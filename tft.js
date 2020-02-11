console.clear();

const data = [];
let dataDetails = [];

fetch("https://tft-db.herokuapp.com/api/items")
  .then(function(response) {
    return response.json();
  })
  .then(function(items) {
    items.map(item => data.push(item.name));
    dataDetails = items;
  })
  .catch(function(err) {
    console.warn("Something went wrong.", err);
  });

class Autocomplete {
  constructor({
    rootNode,
    inputNode,
    resultsNode,
    searchFn,
    shouldAutoSelect = false,
    onShow = () => {},
    onHide = () => {}
  } = {}) {
    this.rootNode = rootNode;
    this.inputNode = inputNode;
    this.resultsNode = resultsNode;
    this.searchFn = searchFn;
    this.shouldAutoSelect = shouldAutoSelect;
    this.onShow = onShow;
    this.onHide = onHide;
    this.activeIndex = -1;
    this.resultsCount = 0;
    this.showResults = false;
    this.hasInlineAutocomplete =
      this.inputNode.getAttribute("aria-autocomplete") === "both";

    // Setup events
    document.body.addEventListener("click", this.handleDocumentClick);
    this.inputNode.addEventListener("keyup", this.handleKeyup);
    this.inputNode.addEventListener("keydown", this.handleKeydown);
    this.inputNode.addEventListener("focus", this.handleFocus);
    this.resultsNode.addEventListener("click", this.handleResultClick);
  }

  // see if ele exists in node
  handleDocumentClick = event => {
    if (
      event.target === this.inputNode ||
      this.rootNode.contains(event.target)
    ) {
      return;
    }
    this.hideResults();
  };

  // define key up & updates on execution, shows suggestions on inline auto complete
  handleKeyup = event => {
    const { key } = event;

    switch (key) {
      case "ArrowUp":
      case "ArrowDown":
      case "Escape":
      case "Enter":
        event.preventDefault();
        return;
      default:
        this.updateResults();
    }

    if (this.hasInlineAutocomplete) {
      switch (key) {
        case "Backspace":
          return;
        default:
          this.autocompleteQuery();
      }
    }
  };

  // def events for esc, down & up updates for results
  handleKeydown = event => {
    const { key } = event;
    let activeIndex = this.activeIndex;

    if (key === "Escape") {
      this.hideResults();
      this.inputNode.value = "";
      return;
    }

    if (this.resultsCount < 1) {
      if (
        this.hasInlineAutocomplete &&
        (key === "ArrowDown" || key === "ArrowUp")
      ) {
        this.updateResults();
      } else {
        return;
      }
    }

    // selects based on index, - index up, + index down, selects query on enter
    // inline complete w/tab
    // submits on enter
    const prevActive = this.getQueryAt(activeIndex);
    let activeQuery;

    switch (key) {
      case "ArrowUp":
        if (activeIndex <= 0) {
          activeIndex = this.resultsCount - 1;
        } else {
          activeIndex -= 1;
        }
        break;
      case "ArrowDown":
        if (activeIndex === -1 || activeIndex >= this.resultsCount - 1) {
          activeIndex = 0;
        } else {
          activeIndex += 1;
        }
        break;
      case "Enter":
        activeQuery = this.getQueryAt(activeIndex);
        this.selectQuery(activeQuery);
        return;
      case "Tab":
        this.checkSelection();
        this.hideResults();
        return;
      default:
        return;
    }

    // for css classes
    event.preventDefault();
    activeQuery = this.getQueryAt(activeIndex);
    this.activeIndex = activeIndex;

    if (prevActive) {
      prevActive.classList.remove("selected");
      prevActive.setAttribute("aria-selected", "false");
    }

    if (activeQuery) {
      this.inputNode.setAttribute(
        "aria-activedescendant",
        `autocomplete-result-${activeIndex}`
      );
      activeQuery.classList.add("selected");
      activeQuery.setAttribute("aria-selected", "true");
      if (this.hasInlineAutocomplete) {
        this.inputNode.value = activeQuery.innerText;
      }
    } else {
      this.inputNode.setAttribute("aria-activedescendant", "");
    }
  };

  // handles the focus w/selector
  handleFocus = event => {
    this.updateResults();
  };

  // handles clicks on result list
  handleResultClick = event => {
    if (event.target && event.target.nodeName === "LI") {
      this.selectQuery(event.target);
    }
  };

  //retrieves queries
  getQueryAt = index => {
    return this.resultsNode.querySelector(`#autocomplete-result-${index}`);
  };

  selectQuery = node => {
    if (node) {
      this.inputNode.value = node.innerText;
      this.hideResults();
    }
  };

  checkSelection = () => {
    if (this.activeIndex < 0) {
      return;
    }
    const activeQuery = this.getQueryAt(this.activeIndex);
    this.selectQuery(activeQuery);
  };

  autocompleteQuery = event => {
    const autocompletedQuery = this.resultsNode.querySelector(".selected");
    const input = this.inputNode.value;
    if (!autocompletedQuery || !input) {
      return;
    }

    const autocomplete = autocompletedQuery.innerText;
    if (input !== autocomplete) {
      this.inputNode.value = autocomplete;
      this.inputNode.setSelectionRange(input.length, autocomplete.length);
    }
  };

  updateResults = () => {
    const input = this.inputNode.value;
    const results = this.searchFn(input);

    this.hideResults();
    if (results.length === 0) {
      return;
    }

    this.resultsNode.innerHTML = results
      .map((result, index) => {
        const isSelected = this.shouldAutoSelect && index === 0;
        if (isSelected) {
          this.activeIndex = 0;
        }
        return `
        <li
          id='autocomplete-result-${index}'
          class='autocomplete-result${isSelected ? " selected" : ""}'
          role='option'
          ${isSelected ? "aria-selected='true'" : ""}
        >
          ${result}
        </li>
      `;
      })
      .join("");

    this.resultsNode.classList.remove("hidden");
    this.rootNode.setAttribute("aria-expanded", true);
    this.resultsCount = results.length;
    this.shown = true;
    this.onShow();
  };

  hideResults = () => {
    this.shown = false;
    this.activeIndex = -1;
    this.resultsNode.innerHTML = "";
    this.resultsNode.classList.add("hidden");
    this.rootNode.setAttribute("aria-expanded", "false");
    this.resultsCount = 0;
    this.inputNode.setAttribute("aria-activedescendant", "");
    this.onHide();
  };
}

const search = input => {
  if (input.length < 1) {
    return [];
  }
  return data.filter(data =>
    data.toLowerCase().startsWith(input.toLowerCase())
  );
};

const autocomplete = new Autocomplete({
  rootNode: document.querySelector(".autocomplete"),
  inputNode: document.querySelector(".autocomplete-input"),
  resultsNode: document.querySelector(".autocomplete-results"),
  searchFn: search,
  shouldAutoSelect: true
});

document.querySelector("form").addEventListener("submit", event => {
  event.preventDefault();
  const result = document.querySelector(".search-result");
  const name = document.querySelector(".name");
  const bonus = document.querySelector(".bonus");
  const build = document.querySelector(".built-by");
  const input = document.querySelector(".autocomplete-input");
  const details = dataDetails.filter(
    item => item.name.toLowerCase() === input.value.toLowerCase()
  );
  const combinations = document.querySelector(".combos");

  let existingImage = document.getElementsByTagName("img");

  let existingCombos = document.getElementsByTagName("h5");

  if (existingImage.length) {
    existingImage[0].setAttribute("src", details[0].img);
  } else {
    let img = document.createElement("IMG");
    img.setAttribute("src", details[0].img);
    img.setAttribute("alt", details[0].name);
    result.appendChild(img);
  }

  if (existingCombos && details[0].combos) {
    combinations.innerHTML = "";
    build.innerHTML = "";
    combinations.innerHTML += "Item Combinations:";
    details[0].combos.forEach(element => {
      let h5 = document.createElement("H5");
      let t = document.createTextNode(element);
      h5.appendChild(t);
      combinations.appendChild(h5);
    });
  } else if (existingCombos && details[0].built_with) {
    build.innerHTML = "";
    combinations.innerHTML = "";
    build.innerHTML += "Built with:";
    let arr = [details[0].built_with.item_1, details[0].built_with.item_2];
    arr.forEach(element => {
      let h5 = document.createElement("H5");
      let t = document.createTextNode(element);
      h5.appendChild(t);
      build.appendChild(h5);
    });
  }

  name.innerHTML = `Item name: ${details[0].name}`;
  bonus.innerHTML = `Item bonus: ${details[0].bonus}`;
});
