"use strict";
//
// Model
//
const initialState = {
    currentProblem: null,
    currentAnswer: null,
    answers: JSON.parse(window.localStorage.getItem("answers") ?? "[]"),
    activeProblems: {
        as: [false, true, true, true, true, true, true, true, true, true, true],
        bs: [false, true, true, true, true, true, true, true, true, true, true],
    },
};
const updateState = (action) => (state) => {
    switch (action.type) {
        case "problem/start":
            return {
                ...state,
                currentProblem: {
                    a: action.a,
                    b: action.b,
                    startTime: action.startTime,
                },
            };
        case "activeProblems/toggle/a":
            return {
                ...state,
                activeProblems: {
                    ...state.activeProblems,
                    as: state.activeProblems.as.map((isEnabled, problem) => (problem === action.a ? !isEnabled : isEnabled)),
                },
            };
        case "activeProblems/toggle/b":
            return {
                ...state,
                activeProblems: {
                    ...state.activeProblems,
                    bs: state.activeProblems.bs.map((isEnabled, problem) => (problem === action.b ? !isEnabled : isEnabled)),
                },
            };
        case "answer/update":
            if (state.currentProblem == null) {
                return state;
            }
            return {
                ...state,
                currentAnswer: action.answer,
            };
        case "answer/confirm":
            return state.currentProblem == null || state.currentAnswer == null
                ? state
                : {
                    ...state,
                    currentProblem: null,
                    currentAnswer: null,
                    answers: [
                        ...state.answers,
                        {
                            ...state.currentProblem,
                            answer: state.currentAnswer,
                            answerTime: action.answerTime,
                        },
                    ],
                };
        case "history/clear":
            return { ...state, answers: [] };
        default:
            const { type } = action;
            throw new Error(`Unhandled action: '${type}'`);
    }
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
    function create(state, eq = Object.is) {
        const listeners = [];
        const signal = listener => {
            listeners.push(listener);
            listener(state);
        };
        const setState = update => {
            const newState = update(state);
            if (!eq(state, newState)) {
                for (const listener of listeners) {
                    listener(newState, state);
                }
                state = newState;
            }
        };
        return [signal, setState];
    }
    State.create = create;
    const on = (extract, listener) => (next, prev) => {
        const nextValue = extract(next);
        if (prev === undefined) {
            listener(nextValue);
        }
        else {
            const prevValue = extract(prev);
            if (!Object.is(nextValue, prevValue)) {
                listener(nextValue, prevValue);
            }
        }
    };
    function map(signal, f) {
        return listener => signal(on(f, listener));
    }
    State.map = map;
    const sequenceEquals = (a, b) => {
        for (let i = 0; i < a.length; i++) {
            if (!Object.is(a[i], b[i])) {
                return false;
            }
        }
        return true;
    };
    function zip(a, b, f) {
        const [signal, setState] = State.create([undefined, undefined], sequenceEquals);
        a(a => setState(s => [a, s[1]]));
        b(b => setState(s => [s[0], b]));
        return map(signal, s => f(...s));
    }
    State.zip = zip;
})(State || (State = {}));
var Store;
(function (Store) {
    const isThunk = (action) => typeof action === "function";
    function create(initialState, update) {
        const [signal, setState] = State.create(initialState);
        const dispatch = action => {
            if (isThunk(action)) {
                setState(s => {
                    const nextAction = action(s);
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
const [appState, dispatch] = Store.create(initialState, updateState);
//appState(s => console.log("appState", s));
const answers = State.map(appState, s => s.answers);
answers(answers => window.localStorage.setItem("answers", JSON.stringify(answers)));
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
    AnswersByProblemIndex.key = (a, b) => `${a}*${b}`;
    const add = (answer) => (index) => {
        const p = AnswersByProblemIndex.key(answer.a, answer.b);
        return {
            ...index,
            [p]: [...(index[p] ?? []), answer],
        };
    };
    function create(answers) {
        const [subbscribe, update] = State.create({});
        let indexed = 0;
        answers(answers => {
            for (let i = indexed; i < answers.length; i++) {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                update(add(answers[i]));
            }
            indexed = answers.length;
        });
        return subbscribe;
    }
    AnswersByProblemIndex.create = create;
})(AnswersByProblemIndex || (AnswersByProblemIndex = {}));
const answersByProblem = AnswersByProblemIndex.create(answers);
const MAX_DURATION = 10_000;
const results = State.map(answersByProblem, index => {
    const results = [];
    for (let a = 1; a < 10; a++) {
        for (let b = 1; b < 10; b++) {
            const c = a * b;
            const p = AnswersByProblemIndex.key(a, b);
            let answers = index[p] ?? [];
            let lastAnswerTime = 0;
            if (answers.length !== 0) {
                // Last 9 answers
                answers.sort((a1, a2) => a2.answerTime - a1.answerTime); //a1-a2 = ascending, a2-a1 = descending;
                answers = answers.slice(0, Math.min(answers.length, 9));
                lastAnswerTime = answers[0].answerTime;
                // in ascending order
                answers.reverse();
            }
            const isCorrect = [];
            let streak = 0;
            let duration = MAX_DURATION;
            for (let i = 0; i < 10 && i < answers.length; i++) {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                const answer = answers[i];
                if (answer.answer === c) {
                    isCorrect[i] = true;
                    streak++;
                    duration = Math.min(duration, answer.answerTime - answer.startTime);
                }
                else {
                    isCorrect[i] = false;
                    streak = 0;
                    duration = MAX_DURATION;
                }
            }
            results.push({ a, b, isCorrect, lastAnswerTime, streak, duration });
        }
    }
    results.sort((p1, p2) => {
        const byCorrectAnswersAscending = p1.streak - p2.streak;
        if (byCorrectAnswersAscending !== 0) {
            return byCorrectAnswersAscending;
        }
        const byLastAnswerTimeAscending = p1.lastAnswerTime - p2.lastAnswerTime;
        if (byLastAnswerTimeAscending !== 0) {
            return byLastAnswerTimeAscending;
        }
        return Math.random() - 0.5;
    });
    return results;
});
// When answer is posted, trigger next problem
results(p => {
    setTimeout(() => {
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        dispatch(state => {
            const { as, bs } = state.activeProblems;
            for (let { a, b } of p) {
                if (as[a] && bs[b]) {
                    return {
                        type: "problem/start",
                        a,
                        b,
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
function createProblemView([appState, dispatch]) {
    const root = document.createElement("div");
    root.className = "problem";
    const currentProblem = State.map(appState, s => s.currentProblem);
    const currentAnswer = State.map(appState, s => s.currentAnswer);
    root.appendChild(createExpression(currentProblem, currentAnswer));
    root.appendChild(createKeypad({
        onDigit(digit) {
            dispatch(state => {
                const currentAnswer = state.currentAnswer;
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
        onErase() {
            dispatch(state => {
                const answer = state.currentAnswer;
                if (answer === null) {
                    return undefined;
                }
                const answerString = String(answer);
                if (answerString.length == 1) {
                    return { type: "answer/update", answer: null };
                }
                else {
                    const newAnswer = Number(answerString.substring(0, answerString.length - 1));
                    return { type: "answer/update", answer: newAnswer };
                }
            });
        },
        onConfirm() {
            dispatch({ type: "answer/confirm", answerTime: Date.now() });
        },
    }));
    return root;
    function createExpression(problem, answer) {
        const root = document.createElement("div");
        root.className = "expression row justify-content-center";
        root.innerHTML = `
      <div class="lhs"></div>
      <div class="rhs"></div>
    `;
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        const lhs = root.querySelector(".lhs");
        problem(p => (lhs.innerHTML = p != null ? `${p.a} × ${p.b} =&nbsp;` : ""));
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        const rhs = root.querySelector(".rhs");
        answer(a => (rhs.innerHTML = a != null ? String(a) : ""));
        return root;
    }
    function createKeypad(props) {
        const root = document.createElement("table");
        root.className = "keypad";
        root.innerHTML = `
      <tr><td><button>1</button></td><td><button>2</button></td><td><button>3</button></td></tr>
      <tr><td><button>4</button></td><td><button>5</button></td><td><button>6</button></td></tr>
      <tr><td><button>7</button></td><td><button>8</button></td><td><button>9</button></td></tr>
      <tr><td><button>✓</button></td><td><button>0</button></td><td><button>⌫</button></td></tr>
    `;
        const buttons = root.querySelectorAll("button");
        for (let i = 0; i < buttons.length; i++) {
            const button = buttons[i];
            button.addEventListener("click", ev => {
                const btn = ev.target;
                const txt = btn.innerHTML;
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
    const results = State.map(vm, s => s.results);
    const activeProblems = State.map(vm, s => s.activeProblems);
    const table = document.createElement("table");
    table.className = "result-view";
    table.appendChild(createHeaderRow());
    for (let row = 1; row < height; row++) {
        table.appendChild(createBodyRow(row));
    }
    return table;
    function createHeaderRow() {
        const tr = document.createElement("tr");
        const th = document.createElement("th");
        th.innerText = "×";
        tr.appendChild(th);
        for (let col = 1; col < width; col++) {
            const th = document.createElement("th");
            th.innerHTML = String(col);
            th.addEventListener("click", () => {
                dispatch({ type: "activeProblems/toggle/b", b: col });
            });
            activeProblems(ps => {
                th.className = ps.bs[col] ? "enabled" : "disabled";
            });
            tr.appendChild(th);
        }
        return tr;
    }
    function createBodyRow(row) {
        const tr = document.createElement("tr");
        const th = document.createElement("th");
        th.innerHTML = String(row);
        th.addEventListener("click", () => {
            dispatch({ type: "activeProblems/toggle/a", a: row });
        });
        activeProblems(ps => {
            th.className = ps.as[row] ? "enabled" : "disabled";
        });
        tr.appendChild(th);
        for (let col = 1; col < width; col++) {
            const td = document.createElement("td");
            const signal = State.map(results, problems => {
                for (const p of problems) {
                    if (p.a === row && p.b == col) {
                        const score = 1 - p.duration / MAX_DURATION;
                        return {
                            innerHTML: p.isCorrect.map(correct => (correct ? "🟢" : "🔴")).join("&ZeroWidthSpace;"),
                            style: {
                                backgroundColor: `hsl(0, 0%, ${score * 100}%)`,
                            },
                        };
                    }
                }
                return { innerHTML: "", style: { backgroundColor: "transparent" } };
            });
            signal(s => {
                td.innerHTML = s.innerHTML;
                td.style.backgroundColor = s.style.backgroundColor;
            });
            tr.appendChild(td);
        }
        return tr;
    }
}
const lContent = document.createElement("div");
lContent.className = "col";
lContent.appendChild(createProblemView([appState, dispatch]));
const rContent = document.createElement("div");
rContent.className = "col align-items-center justify-content-center";
const activeProblems = State.map(appState, f => f.activeProblems);
const resultViewVM = State.zip(activeProblems, results, (activeProblems, results) => ({ activeProblems, results }));
rContent.appendChild(createResultView(10, 10, resultViewVM));
const contentElement = document.body;
contentElement.className = "container";
contentElement.appendChild(lContent);
contentElement.appendChild(rContent);
//# sourceMappingURL=index.js.map