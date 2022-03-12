"use strict";
//
// Model
//
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
var _a;
var initialState = {
    currentProblem: null,
    currentAnswer: null,
    answers: JSON.parse((_a = window.localStorage.getItem("answers")) !== null && _a !== void 0 ? _a : "[]"),
    activeProblems: {
        as: [false, true, true, true, true, true, true, true, true, true, true],
        bs: [false, true, true, true, true, true, true, true, true, true, true],
    },
};
var updateState = function (action) {
    return function (state) {
        switch (action.type) {
            case "problem/start":
                return __assign(__assign({}, state), { currentProblem: {
                        a: action.a,
                        b: action.b,
                        startTime: action.startTime,
                    } });
            case "activeProblems/toggle/a":
                return __assign(__assign({}, state), { activeProblems: __assign(__assign({}, state.activeProblems), { as: state.activeProblems.as.map(function (isEnabled, problem) { return (problem === action.a ? !isEnabled : isEnabled); }) }) });
            case "activeProblems/toggle/b":
                return __assign(__assign({}, state), { activeProblems: __assign(__assign({}, state.activeProblems), { bs: state.activeProblems.bs.map(function (isEnabled, problem) { return (problem === action.b ? !isEnabled : isEnabled); }) }) });
            case "answer/update":
                if (state.currentProblem == null) {
                    return state;
                }
                return __assign(__assign({}, state), { currentAnswer: action.answer });
            case "answer/confirm":
                return state.currentProblem == null || state.currentAnswer == null
                    ? state
                    : __assign(__assign({}, state), { currentProblem: null, currentAnswer: null, answers: __spreadArray(__spreadArray([], state.answers, true), [
                            __assign(__assign({}, state.currentProblem), { answer: state.currentAnswer, answerTime: action.answerTime }),
                        ], false) });
            case "history/clear":
                return __assign(__assign({}, state), { answers: [] });
            default:
                var type = action.type;
                throw new Error("Unhandled action: '".concat(type, "'"));
        }
    };
};
// namespace JSX {
//   export type IntrinsicElements = {
//     [K in keyof HTMLElementTagNameMap]: Partial<HTMLElementTagNameMap[K]>;
//   };
//   type Component<P extends object> = (
//     props: P,
//     ...children: Node[]
//   ) => HTMLElement;
//   export function createElement<P extends object,T extends keyof IntrinsicElements>(
//     tag: T | Component<P>,
//     attributes: IntrinsicElements[T] | P,
//     ...children: Node[]
//   ): HTMLElement {
//     if (typeof tag === "function") return tag(attributes, ...children);
//     const element = document.createElement(tag);
//     for(const a in attributes){
//       if(attributes.hasOwnProperty(a)){
//         //element.setAttribute()
//         element[a] = (attributes as HTMLElementTagNameMap[T])[prop];
//       }
//     }
//     for(const child of children){
//       element.appendChild(child);
//     }
//     return element;
//   }
// }
var State;
(function (State) {
    function create(state, eq) {
        if (eq === void 0) { eq = Object.is; }
        var listeners = [];
        var signal = function (listener) {
            listeners.push(listener);
            listener(state);
        };
        var setState = function (update) {
            var newState = update(state);
            if (!eq(state, newState)) {
                for (var _i = 0, listeners_1 = listeners; _i < listeners_1.length; _i++) {
                    var listener = listeners_1[_i];
                    listener(newState, state);
                }
                state = newState;
            }
        };
        return [signal, setState];
    }
    State.create = create;
    var on = function (extract, listener) {
        return function (next, prev) {
            var nextValue = extract(next);
            if (prev === undefined) {
                listener(nextValue);
            }
            else {
                var prevValue = extract(prev);
                if (!Object.is(nextValue, prevValue)) {
                    listener(nextValue, prevValue);
                }
            }
        };
    };
    function map(signal, f) {
        return function (listener) { return signal(on(f, listener)); };
    }
    State.map = map;
    var sequenceEquals = function (a, b) {
        for (var i = 0; i < a.length; i++) {
            if (!Object.is(a[i], b[i])) {
                return false;
            }
        }
        return true;
    };
    function zip(a, b, f) {
        var _a = State.create([undefined, undefined], sequenceEquals), signal = _a[0], setState = _a[1];
        a(function (a) { return setState(function (s) { return [a, s[1]]; }); });
        b(function (b) { return setState(function (s) { return [s[0], b]; }); });
        return map(signal, function (s) { return f.apply(void 0, s); });
    }
    State.zip = zip;
})(State || (State = {}));
var Store;
(function (Store) {
    var isThunk = function (action) { return typeof action === "function"; };
    function create(initialState, update) {
        var _a = State.create(initialState), signal = _a[0], setState = _a[1];
        var dispatch = function (action) {
            if (isThunk(action)) {
                setState(function (s) {
                    var nextAction = action(s);
                    if (nextAction !== undefined) {
                        return update(nextAction)(s);
                    }
                    else {
                        return s;
                    }
                });
            }
            else {
                setState(update(action));
            }
        };
        return [signal, dispatch];
    }
    Store.create = create;
})(Store || (Store = {}));
var _b = Store.create(initialState, updateState), appState = _b[0], dispatch = _b[1];
//appState(s => console.log("appState", s));
var answers = State.map(appState, function (s) { return s.answers; });
answers(function (answers) { return window.localStorage.setItem("answers", JSON.stringify(answers)); });
//
// Spaced repetition suggests that long term retention improves with the number of trials between repeated (succesfull) tests
// where trials are attemts to answer a problem.
// Thus bin problems by number of successful answers (since last error?), order each bin by time last answered
// For problems with no answers simply assign a random order
// Then, from the problems with least answers, pick the problem least recently answered
//
// Indices
var AnswersByProblemIndex;
(function (AnswersByProblemIndex) {
    AnswersByProblemIndex.key = function (a, b) { return "".concat(a, "*").concat(b); };
    var add = function (answer) { return function (index) {
        var _a;
        var _b;
        var p = AnswersByProblemIndex.key(answer.a, answer.b);
        return __assign(__assign({}, index), (_a = {}, _a[p] = __spreadArray(__spreadArray([], ((_b = index[p]) !== null && _b !== void 0 ? _b : []), true), [answer], false), _a));
    }; };
    function create(answers) {
        var _a = State.create({}), subbscribe = _a[0], update = _a[1];
        var indexed = 0;
        answers(function (answers) {
            for (var i = indexed; i < answers.length; i++) {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                update(add(answers[i]));
            }
            indexed = answers.length;
        });
        return subbscribe;
    }
    AnswersByProblemIndex.create = create;
})(AnswersByProblemIndex || (AnswersByProblemIndex = {}));
var answersByProblem = AnswersByProblemIndex.create(answers);
var results = State.map(answersByProblem, function (index) {
    var _a;
    var results = [];
    for (var a = 1; a < 10; a++) {
        for (var b = 1; b < 10; b++) {
            var c = a * b;
            var p = AnswersByProblemIndex.key(a, b);
            var answers_1 = (_a = index[p]) !== null && _a !== void 0 ? _a : [];
            answers_1.sort(function (a1, a2) { return a2.answerTime - a1.answerTime; }); //a1-a2 = ascending, a2-a1 = descending;
            answers_1 = answers_1.slice(0, Math.min(answers_1.length, 9));
            answers_1.reverse();
            var isCorrect = [];
            var lastAnswerTime = 0;
            var correctAnswers = 0;
            for (var i = 0; i < 10 && i < answers_1.length; i++) {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                var answer = answers_1[i];
                if (answer.answer === c) {
                    isCorrect[i] = true;
                    correctAnswers++;
                }
                else {
                    isCorrect[i] = false;
                    correctAnswers = 0;
                }
                if (answer.answerTime > lastAnswerTime) {
                    lastAnswerTime = answer.answerTime;
                }
            }
            results.push({ a: a, b: b, isCorrect: isCorrect, lastAnswerTime: lastAnswerTime, correctAnswers: correctAnswers });
        }
    }
    results.sort(function (p1, p2) {
        var byCorrectAnswersAscending = p1.correctAnswers - p2.correctAnswers;
        if (byCorrectAnswersAscending !== 0) {
            return byCorrectAnswersAscending;
        }
        var byLastAnswerTimeAscending = p1.lastAnswerTime - p2.lastAnswerTime;
        if (byLastAnswerTimeAscending !== 0) {
            return byLastAnswerTimeAscending;
        }
        return Math.random() - 0.5;
    });
    return results;
});
// When answer is posted, trigger next problem
results(function (p) {
    setTimeout(function () {
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        dispatch(function (state) {
            var _a = state.activeProblems, as = _a.as, bs = _a.bs;
            for (var _i = 0, p_1 = p; _i < p_1.length; _i++) {
                var _b = p_1[_i], a = _b.a, b = _b.b;
                if (as[a] && bs[b]) {
                    return {
                        type: "problem/start",
                        a: a,
                        b: b,
                        startTime: Date.now(),
                    };
                }
            }
            return undefined;
        });
    }, 0);
});
//
// Views
//
function createProblemView(_a) {
    var appState = _a[0], dispatch = _a[1];
    var root = document.createElement("div");
    root.className = "problem";
    var currentProblem = State.map(appState, function (s) { return s.currentProblem; });
    var currentAnswer = State.map(appState, function (s) { return s.currentAnswer; });
    root.appendChild(createExpression(currentProblem, currentAnswer));
    root.appendChild(createKeypad({
        onDigit: function (digit) {
            dispatch(function (state) {
                var currentAnswer = state.currentAnswer;
                if (currentAnswer === null) {
                    return {
                        type: "answer/update",
                        answer: Number(digit),
                    };
                }
                else {
                    return {
                        type: "answer/update",
                        answer: Number(String(currentAnswer) + digit),
                    };
                }
            });
        },
        onErase: function () {
            dispatch(function (state) {
                var answer = state.currentAnswer;
                if (answer === null) {
                    return undefined;
                }
                var answerString = String(answer);
                if (answerString.length == 1) {
                    return { type: "answer/update", answer: null };
                }
                else {
                    var newAnswer = Number(answerString.substring(0, answerString.length - 1));
                    return { type: "answer/update", answer: newAnswer };
                }
            });
        },
        onConfirm: function () {
            dispatch({ type: "answer/confirm", answerTime: Date.now() });
        },
    }));
    return root;
    function createExpression(problem, answer) {
        var root = document.createElement("div");
        root.className = "expression row justify-content-center";
        root.innerHTML = "\n      <div class=\"lhs\"></div>\n      <div class=\"rhs\"></div>\n    ";
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        var lhs = root.querySelector(".lhs");
        problem(function (p) { return (lhs.innerHTML = p != null ? "".concat(p.a, " \u00D7 ").concat(p.b, " =&nbsp;") : ""); });
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        var rhs = root.querySelector(".rhs");
        answer(function (a) { return (rhs.innerHTML = a != null ? String(a) : ""); });
        return root;
    }
    function createKeypad(props) {
        var root = document.createElement("table");
        root.className = "keypad";
        root.innerHTML = "\n      <tr><td><button>1</button></td><td><button>2</button></td><td><button>3</button></td></tr>\n      <tr><td><button>4</button></td><td><button>5</button></td><td><button>6</button></td></tr>\n      <tr><td><button>7</button></td><td><button>8</button></td><td><button>9</button></td></tr>\n      <tr><td><button>\u2713</button></td><td><button>0</button></td><td><button>\u232B</button></td></tr>\n    ";
        var buttons = root.querySelectorAll("button");
        for (var i = 0; i < buttons.length; i++) {
            var button = buttons[i];
            button.addEventListener("click", function (ev) {
                var btn = ev.target;
                var txt = btn.innerHTML;
                switch (txt) {
                    case "0":
                    case "1":
                    case "2":
                    case "3":
                    case "4":
                    case "5":
                    case "6":
                    case "7":
                    case "8":
                    case "9":
                        props.onDigit(btn.innerHTML);
                        break;
                    case "⌫":
                        props.onErase();
                        break;
                    case "✓":
                        props.onConfirm();
                        break;
                    default:
                }
            });
        }
        return root;
    }
}
function createResultView(width, height, vm) {
    var results = State.map(vm, function (s) { return s.results; });
    var activeProblems = State.map(vm, function (s) { return s.activeProblems; });
    var table = document.createElement("table");
    table.className = "result-view";
    table.appendChild(createHeaderRow());
    for (var row = 1; row < height; row++) {
        table.appendChild(createBodyRow(row));
    }
    return table;
    function createHeaderRow() {
        var tr = document.createElement("tr");
        var th = document.createElement("th");
        th.innerText = "×";
        tr.appendChild(th);
        var _loop_1 = function (col) {
            var th_1 = document.createElement("th");
            th_1.innerHTML = String(col);
            th_1.addEventListener("click", function () {
                dispatch({ type: "activeProblems/toggle/b", b: col });
            });
            activeProblems(function (ps) {
                th_1.className = ps.bs[col] ? "enabled" : "disabled";
            });
            tr.appendChild(th_1);
        };
        for (var col = 1; col < width; col++) {
            _loop_1(col);
        }
        return tr;
    }
    function createBodyRow(row) {
        var tr = document.createElement("tr");
        var th = document.createElement("th");
        th.innerHTML = String(row);
        th.addEventListener("click", function () {
            dispatch({ type: "activeProblems/toggle/a", a: row });
        });
        activeProblems(function (ps) {
            th.className = ps.as[row] ? "enabled" : "disabled";
        });
        tr.appendChild(th);
        var _loop_2 = function (col) {
            var td = document.createElement("td");
            var r = row;
            var c = col;
            var signal = State.map(results, function (problems) {
                for (var _i = 0, problems_1 = problems; _i < problems_1.length; _i++) {
                    var p = problems_1[_i];
                    if (p.a === r && p.b == c) {
                        return p.isCorrect.map(function (correct) { return (correct ? "🟢" : "🔴"); }).join("");
                    }
                }
                return "";
            });
            signal(function (s) { return (td.innerHTML = s); });
            tr.appendChild(td);
        };
        for (var col = 1; col < width; col++) {
            _loop_2(col);
        }
        return tr;
    }
}
var lContent = document.createElement("div");
lContent.className = "col";
lContent.appendChild(createProblemView([appState, dispatch]));
var rContent = document.createElement("div");
rContent.className = "col align-items-center justify-content-center";
var activeProblems = State.map(appState, function (f) { return f.activeProblems; });
var resultViewVM = State.zip(activeProblems, results, function (activeProblems, results) { return ({ activeProblems: activeProblems, results: results }); });
rContent.appendChild(createResultView(10, 10, resultViewVM));
var contentElement = document.body;
contentElement.className = "container";
contentElement.appendChild(lContent);
contentElement.appendChild(rContent);
//# sourceMappingURL=index.js.map