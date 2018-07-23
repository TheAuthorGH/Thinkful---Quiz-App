'use strict';

/*	Note: The last revision of this project was rejected because of the Blind Mode feature,
	which ultimately caused some quizzes to go against the requirements. The feature can no
	longer be triggered through the app, but it still exists in the code. */

/*	Note: In a real scenario, we can expect the quizzes to come from a database of sorts.
	However, since that's outside of the scope of the quiz application, quizzes will be
	loaded from an external json file.`
*/

// quizzes

let quizzes; // This is an array. Technically, we could add as many quizzes as we wanted.

// This object is used by the rest of the script as an easy way to manage a running quiz.
// It keeps track of the current question and all the submitted answers.
const quizManager = {
	_quiz: null,
	_question: 0, // Marks the current question by its array index.
	_feedback: true, // If false, "blind mode" is activated.
	_answers: [],
	// Prepares a quiz for execution. All other functions depend on the currently loaded quiz.
	loadQuiz: function(quiz) {
		this._quiz = quiz;
		this._question = 0;
		this._answers.length = 0;
		// this._feedback = !quiz.blind;
		if(quiz.random)
			shuffleArray(quiz.questions);
		return this;
	},
	// Tells the manager to register a newly submitted answer, which also advances the quiz to the next question.
	answer: function(index) {
		this._answers.push(index);
		this._question += this._question >= this.length() ? 0 : 1;
		return this;
	},
	// Returns the currently loaded quiz.
	quiz: function() {
		return this._quiz;
	},
	// Returns the question in the given index, or the current question if no index is provided.
	question: function(index = this.progress()) {
		return this.quiz().questions[index];
	},
	feedback: function() {
		return this._feedback;
	},
	// Works out the score by comparing all submitted answers to the correct ones.
	score: function() {
		return this._answers.map((a, i) => this.solution(i) === a).reduce((a, b) => a + b, 0);
	},
	// Amount of total questions, regardless of progress
	length: function() {
		return this.quiz().questions.length;
	},
	// Amount of submitted answers
	progress: function() {
		return this._answers.length;
	},
	// Returns true if no questions remain.
	done: function() {
		return this.progress() === this.length();
	},
	// Checks if a submitted answer is correct. If no answer index is provided, the latest answer is checked.
	correct: function(index = this.progress() - 1) {
		return this._answers[index] === this.solution(index);
	},
	// Returns the index of the correct solution for a question. If no question index is provided, the latest answered question is used.
	solution: function(index = this.progress() - 1) {
		return this.question(index).solution;
	},
	// Returns the evaluation message based on the final score.
	// Evaluation messages are ordered and chosen by score percentages.
	evaluation: function() {
		const levels = Object.keys(this.quiz().evaluation).map(l => Number(l)).sort((a, b) => b - a);
		const percent = Math.floor((this.score() / this.length()) * 100);
		return this.quiz().evaluation[levels.find(l => l <= percent)];
	}
};

// Used whenever the current screen changes. Sections are hidden and shown when needed.
function resetQuizSections() {
	$('.quiz-section').hide();
}

// Intro Screen

function startQuizIntro() {
	resetQuizSections();
	$('#quiz-quizlist').html(quizzes.map(q => `<option>${q.name}</option>`).join('\n'));
	$('.quiz-intro').show();
	updateQuizIntro();
}

function updateQuizIntro() {
	const selected = quizzes[getSelectedQuizIndex()];
	$('#quiz-quizdesc p').hide().html(selected.desc).fadeIn();
	$('#quiz-quizlength').html(`${selected.questions.length} Questions`);
	$('#quiz-quizmode').html(selected.blind ? ' - Blind Mode' : ' - Normal Mode');
}

function handleQuizIntroControls() {
	$('#quiz-quizlist').change(updateQuizIntro);
	$('#quiz-quizselection').submit(function(evt) {
		evt.preventDefault();
		startQuizQuestions(getSelectedQuizIndex());
	});
}

function getSelectedQuizIndex() {
	return quizzes.findIndex(q => q.name === $('#quiz-quizlist').val());
}

// Questionnaire Screen

function startQuizQuestions(quizIndex) {
	resetQuizSections();
	$('#quiz-progressbar > div').css('width', '0%');
	const quiz = quizManager.loadQuiz(quizzes[quizIndex]).quiz();
	$('.quiz-question, .quiz-answers').fadeIn();
	updateQuizQuestion();
}

function updateQuizQuestion() {
	if(quizManager.done()) {
		startQuizResults();
		return;
	}
	const question = quizManager.question();
	$('#quiz-progressbar > div').animate({'width': ((quizManager.progress()/quizManager.length()) * 100) + '%'}, 200);
	$('#quiz-stats-text')
		.html(`<span>Question ${quizManager.progress() + 1}/${quizManager.length()}</span>`)
		.append(quizManager.feedback() ? `<span>Score: ${quizManager.score()}</span>` : '');
	$('#quiz-question-text').html(question.text);
	$('#quiz-answerfeedback').empty();
	const answers = question.answers;
	const fieldset = $('#quiz-answerselection > fieldset');
	fieldset.find('div').remove();
	for(let i = 0; i < answers.length; i++) {
		const id = 'quiz-answer-' + i;
		fieldset.append(
			`<div class="quiz-answer"><input type="radio" name="quiz-answer" id="${id}" quiz-answer-index="${i}"/><label for="${id}">${answers[i]}</label></div>`);
	}
	fieldset.prop('disabled', false);
	fieldset.find('input[type="radio"]').first().focus().prop('checked', true);
	$('#quiz-answerselection button[type="submit"]').text('Submit').removeClass('quiz-advancequestion');
}

function getSelectedAnswerIndex() {
	const answer = $('input[name="quiz-answer"]:checked');
	return answer.length === 0 ? null : Number(answer.attr('quiz-answer-index'));
}

function answerSubmitted() {
	const index = getSelectedAnswerIndex();
	if(index == null)
		return;
	quizManager.answer(index);
	if(!quizManager.feedback()) {
		updateQuizQuestion();
		return;
	}
	$('#quiz-answerselection button[type="submit"]').text('Next').addClass('quiz-advancequestion').focus();
	$('#quiz-answerselection > fieldset').prop('disabled', true);
	const fbarea = $('#quiz-answerfeedback');
	const selected = $(`input[quiz-answer-index="${index}"]`);
	$('input').not(`[quiz-answer-index="${index}"]`).parent().addClass('quiz-neutral');
	if(quizManager.correct()) {
		fbarea.html('<span class="quiz-correct">Correct!</span>');
		selected.parent().addClass('quiz-correct');
	} else {
		fbarea.html(`<span class="quiz-incorrect">Incorrect!</span><span>Correct answer: Option ${quizManager.solution() + 1}</span>`);
		selected.parent().addClass('quiz-incorrect');
	}
}

function handleQuizQuestionControls() {
	$('#quiz-answerselection').submit(evt => {
		evt.preventDefault();
		if($(evt.currentTarget).find('button[type="submit"]').hasClass('quiz-advancequestion'))
			updateQuizQuestion();
		else
			answerSubmitted();
	});
	$('#quiz-answerselection > fieldset').on('click', 'div.quiz-answer', function() {
		$(this).find('input').prop('checked', true);
	});
}

// Results Screen

function startQuizResults() {
	resetQuizSections();
	$('.quiz-results').fadeIn();
	$('#quiz-results-text').html(
		`<span>Final Score: <strong>${quizManager.score()}/${quizManager.length()} (${Math.floor(100 * (quizManager.score()/quizManager.length()))}%)</strong></span>
		<span><em>${quizManager.evaluation()}</em></span>`);
	$('#quiz-restart').focus();
}

function handleQuizResultsControls() {
	$('#quiz-restart').click(startQuizIntro);
}

// Wrapping all of the above up

function handleControls() {
	handleQuizIntroControls();
	handleQuizQuestionControls();
	handleQuizResultsControls();
}

function initQuiz() {
	console.log('Quiz Application starting!');
	$('main').hide(); /* This will come back when the scripts are working fine. */
	$.get('https://api.myjson.com/bins/19afum', function(data) {
		quizzes = data;
		startQuizIntro();
		handleControls();
		$('main').show();
	}).fail(() => $('body').html('<span style="color: red;">Error loading resources; cannot run this application.</span>'));
}

$(initQuiz);