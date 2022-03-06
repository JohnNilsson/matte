//
// Model
//

type State = {
  currentProblem: Problem | null;
  currentAnswer: number | null;
  answers: Answer[];
  activeProblems: {
    as: boolean[];
    bs: boolean[];
  };
};

type Problem = {
  startTime: number;
  a: number;
  b: number;
};

type Answer = Problem & {
  answer: number;
  answerTime: number;
};

const initialState: State = {
  currentProblem: null,
  currentAnswer: null,
  answers: JSON.parse(window.localStorage.getItem("answers") ?? "[]") as Answer[],
  activeProblems: {
    as: [false, true, true, true, true, true, true, true, true, true, true],
    bs: [false, true, true, true, true, true, true, true, true, true, true],
  },
};

//
// Actions
//
type Action =
  | { type: "problem/start"; a: number; b: number; startTime: number }
  | { type: "answer/update"; answer: number | null }
  | { type: "answer/confirm"; answerTime: number }
  | { type: "history/clear" };

const updateState =
  (action: Action) =>
  (state: State): State => {
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

namespace State {
  type SetState<T> = (update: (state: T) => T) => void;

  export type Listener<T> = (next: T, prev?: T) => void;
  export type Signal<T> = (listener: Listener<T>) => void;

  export function create<T>(state: T): [Signal<T>, SetState<T>] {
    const listeners: Listener<T>[] = [];
    const signal: Signal<T> = listener => {
      listeners.push(listener);
      listener(state);
    };
    const setState: SetState<T> = update => {
      const newState = update(state);
      if (!Object.is(state, newState)) {
        for (const listener of listeners) {
          listener(newState, state);
        }
        state = newState;
      }
    };
    return [signal, setState];
  }

  const on =
    <T, U>(extract: (state: T) => U, listener: Listener<U>): Listener<T> =>
    (next: T, prev?: T) => {
      const nextValue = extract(next);
      if (prev === undefined) {
        listener(nextValue);
      } else {
        const prevValue = extract(prev);
        if (!Object.is(nextValue, prevValue)) {
          listener(nextValue, prevValue);
        }
      }
    };

  export function map<T, U>(signal: Signal<T>, f: (state: T) => U): Signal<U> {
    return listener => signal(on(f, listener));
  }
}

namespace Store {
  type Thunk<S, A> = (state: S) => A | undefined;
  type Action<S, A> = Thunk<S, A> | A;
  type Dispatch<S, A> = (action: Action<S, A>) => void;
  type Reducer<S, A> = (action: A) => (state: S) => S;

  export type Store<S, A> = [State.Signal<S>, Dispatch<S, A>];

  const isThunk = <S, A>(action: Action<S, A>): action is Thunk<S, A> => typeof action === "function";

  export function create<S, A>(initialState: S, update: Reducer<S, A>): Store<S, A> {
    const [signal, setState] = State.create(initialState);
    const dispatch: Dispatch<S, A> = action => {
      if (isThunk(action)) {
        setState(s => {
          const nextAction = action(s);
          if (nextAction !== undefined) {
            return update(nextAction)(s);
          } else {
            return s;
          }
        });
      } else {
        setState(update(action));
      }
    };
    return [signal, dispatch];
  }
}

const [appState, dispatch] = Store.create<State, Action>(initialState, updateState);

appState(s => console.log("appState", s));

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
namespace AnswersByProblemIndex {
  type Index = { [p: string]: Answer[] };
  export const key = (a: number, b: number) => `${a}*${b}`;
  const add = (answer: Answer) => (index: Index) => {
    const p = key(answer.a, answer.b);
    return {
      ...index,
      [p]: [...(index[p] ?? []), answer],
    };
  };
  export function create(answers: State.Signal<Answer[]>) {
    const [subbscribe, update] = State.create<Index>({});

    let indexed = 0;
    answers(answers => {
      for (let i = indexed; i < answers.length; i++) {
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        update(add(answers[i]!));
      }
      indexed = answers.length;
    });

    return subbscribe;
  }
}
const answersByProblem = AnswersByProblemIndex.create(answers);

type Problems = {
  a: number;
  b: number;
  isCorrect: boolean[];
  lastAnswerTime: number;
  correctAnswers: number;
}[];
const problems = State.map(answersByProblem, index => {
  const problems: Problems = [];
  for (let a = 1; a < 10; a++) {
    for (let b = 1; b < 10; b++) {
      const c = a * b;
      const p = AnswersByProblemIndex.key(a, b);
      let answers = index[p] ?? [];
      answers.sort((a1, a2) => a2.answerTime - a1.answerTime); //a1-a2 = ascending, a2-a1 = descending;
      answers = answers.slice(0, Math.min(answers.length, 9));
      answers.reverse();

      const isCorrect: boolean[] = [];
      let lastAnswerTime = 0;
      let correctAnswers = 0;
      for (let i = 0; i < 10 && i < answers.length; i++) {
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        const answer = answers[i]!;
        if (answer.answer === c) {
          isCorrect[i] = true;
          correctAnswers++;
        } else {
          isCorrect[i] = false;
          correctAnswers = 0;
        }
        if (answer.answerTime > lastAnswerTime) {
          lastAnswerTime = answer.answerTime;
        }
      }
      problems.push({ a, b, isCorrect, lastAnswerTime, correctAnswers });
    }
  }
  problems.sort((p1, p2) => {
    const byCorrectAnswersAscending = p1.correctAnswers - p2.correctAnswers;
    if (byCorrectAnswersAscending !== 0) {
      return byCorrectAnswersAscending;
    }
    const byLastAnswerTimeAscending = p1.lastAnswerTime - p2.lastAnswerTime;
    if (byLastAnswerTimeAscending !== 0) {
      return byLastAnswerTimeAscending;
    }
    return Math.random() - 0.5;
  });
  return problems;
});

problems(p => {
  setTimeout(() => {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const problem = p[0]!;
    dispatch({
      type: "problem/start",
      a: problem.a,
      b: problem.b,
      startTime: Date.now(),
    });
  }, 0);
});

//
// Views
//

function createProblemView([appState, dispatch]: Store.Store<State, Action>): HTMLElement {
  const root = document.createElement("div");
  root.className = "problem";

  const currentProblem = State.map(appState, s => s.currentProblem);
  const currentAnswer = State.map(appState, s => s.currentAnswer);

  root.appendChild(createExpression(currentProblem, currentAnswer));

  root.appendChild(
    createKeypad({
      onDigit(digit) {
        dispatch(state => {
          const currentAnswer = state.currentAnswer;
          if (currentAnswer === null) {
            return {
              type: "answer/update",
              answer: Number(digit),
            };
          } else {
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
          } else {
            const newAnswer = Number(answerString.substring(0, answerString.length - 1));
            return { type: "answer/update", answer: newAnswer };
          }
        });
      },
      onConfirm() {
        dispatch({ type: "answer/confirm", answerTime: Date.now() });
      },
    })
  );

  return root;

  function createExpression(problem: State.Signal<Problem | null>, answer: State.Signal<number | null>) {
    const root = document.createElement("div");
    root.className = "expression row justify-content-center";
    root.innerHTML = `
      <div class="lhs"></div>
      <div class="rhs"></div>
    `;
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const lhs = root.querySelector(".lhs")!;
    problem(p => (lhs.innerHTML = p != null ? `${p.a} × ${p.b} =&nbsp;` : ""));
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const rhs = root.querySelector(".rhs")!;
    answer(a => (rhs.innerHTML = a != null ? String(a) : ""));
    return root;
  }

  function createKeypad(props: { onDigit(digit: string): void; onErase(): void; onConfirm(): void }) {
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
      const button = buttons[i]!;

      button.addEventListener("click", ev => {
        const btn = ev.target as HTMLButtonElement;
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

function createResultView(width: number, height: number, problems: State.Signal<Problems>) {
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
      tr.appendChild(th);
    }
    return tr;
  }

  function createBodyRow(row: number) {
    const tr = document.createElement("tr");
    const th = document.createElement("th");
    th.innerHTML = String(row);
    tr.appendChild(th);
    for (let col = 1; col < width; col++) {
      const td = document.createElement("td");
      const r = row;
      const c = col;
      const signal = State.map(problems, problems => {
        const p = problems.find(p => p.a === r && p.b == c);
        if (p === undefined) {
          return "";
        } else {
          return p.isCorrect.map(correct => (correct ? "🟢" : "🔴")).join("");
        }
      });
      signal(s => (td.innerHTML = s));
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
rContent.appendChild(createResultView(10, 10, problems));

const contentElement = document.body;
contentElement.className = "container";
contentElement.appendChild(lContent);
contentElement.appendChild(rContent);
