// =========================================================
// GLOBAL MESSAGE FUNCTION
// =========================================================

function showMessage(elementId, type, message) {

    const element =
        document.getElementById(elementId);

    element.innerHTML = `
        <div class="${type}">
            ${message}
        </div>
    `;
}

// =========================================================
// EXTRACT ANSWER KEY
// =========================================================

const extractBtn =
    document.getElementById(
        "extractBtn"
    );

if (extractBtn) {

    extractBtn.addEventListener(
        "click",
        async function () {

            const fileInput =
                document.getElementById(
                    "answerFile"
                );

            if (
                fileInput.files.length === 0
            ) {

                alert(
                    "Please upload a file"
                );

                return;
            }

            const formData =
                new FormData();

            formData.append(
                "file",
                fileInput.files[0]
            );

            try {

                const response =
                    await fetch(
                        "/api/extract_answers",
                        {
                            method: "POST",
                            body: formData
                        }
                    );

                const data =
                    await response.json();

                if (response.ok) {

                    document.getElementById(
                        "answer_key"
                    ).value = data.answers;

                    alert(
                        "Answers extracted successfully"
                    );

                } else {

                    alert(data.error);
                }

            } catch (error) {

                alert(
                    "Extraction failed"
                );
            }
        });
}

// =========================================================
// CREATE EXAM
// =========================================================

const createExamForm =
    document.getElementById(
        "createExamForm"
    );

if (createExamForm) {

    createExamForm.addEventListener(
        "submit",
        async function (e) {

            e.preventDefault();

            const formData =
                new FormData();

            formData.append(
                "exam_code",
                document.getElementById(
                    "exam_code"
                ).value
            );

            formData.append(
                "num_questions",
                document.getElementById(
                    "num_questions"
                ).value
            );

            formData.append(
                "answer_key",
                document.getElementById(
                    "answer_key"
                ).value
            );

            try {

                const response =
                    await fetch(
                        "/api/create_exam",
                        {
                            method: "POST",
                            body: formData
                        }
                    );

                const data =
                    await response.json();

                if (response.ok) {

                    showMessage(
                        "examMessage",
                        "success",
                        data.message
                    );

                    createExamForm.reset();

                    setTimeout(() => {

                        location.reload();

                    }, 1000);

                } else {

                    showMessage(
                        "examMessage",
                        "error",
                        data.error
                    );
                }

            } catch (error) {

                showMessage(
                    "examMessage",
                    "error",
                    "Server Error"
                );
            }
        });
}

// =========================================================
// GRADE OMR
// =========================================================

const gradeForm =
    document.getElementById(
        "gradeForm"
    );

if (gradeForm) {

    gradeForm.addEventListener(
        "submit",
        async function (e) {

            e.preventDefault();

            const formData =
                new FormData(
                    gradeForm
                );

            try {

                const response =
                    await fetch(
                        "/api/grade",
                        {
                            method: "POST",
                            body: formData
                        }
                    );

                const data =
                    await response.json();

                if (response.ok) {

                    showMessage(
                        "gradeMessage",
                        "success",

                        `
                        ${data.message}
                        <br><br>

                        Score:
                        ${data.score}%
                        <br>

                        Correct:
                        ${data.correct}
                        <br>

                        Incorrect:
                        ${data.incorrect}
                        `
                    );

                    gradeForm.reset();

                    setTimeout(() => {

                        location.reload();

                    }, 1500);

                } else {

                    showMessage(
                        "gradeMessage",
                        "error",
                        data.error
                    );
                }

            } catch (error) {

                showMessage(
                    "gradeMessage",
                    "error",
                    "Server Error"
                );
            }
        });
}

// =========================================================
// LOGIN FORM
// =========================================================

const loginForm =
    document.getElementById(
        "loginForm"
    );

if (loginForm) {

    loginForm.addEventListener(
        "submit",
        async function (e) {

            e.preventDefault();

            const email =
                document.getElementById(
                    "email"
                ).value;

            const password =
                document.getElementById(
                    "password"
                ).value;

            const role =
                document.getElementById(
                    "role"
                ).value;

            try {

                const response =
                    await fetch(
                        "/api/login",
                        {
                            method: "POST",

                            headers: {
                                "Content-Type":
                                    "application/json"
                            },

                            body: JSON.stringify({

                                email,
                                password,
                                role
                            })
                        }
                    );

                const data =
                    await response.json();

                if (response.ok) {

                    showMessage(
                        "message",
                        "success",
                        data.message
                    );

                    setTimeout(() => {

                        window.location.href =
                            data.redirect;

                    }, 1000);

                } else {

                    showMessage(
                        "message",
                        "error",
                        data.error
                    );
                }

            } catch (error) {

                showMessage(
                    "message",
                    "error",
                    "Server Error"
                );
            }
        });
}

// =========================================================
// REGISTER FORM
// =========================================================

const registerForm =
    document.getElementById(
        "registerForm"
    );

if (registerForm) {

    registerForm.addEventListener(
        "submit",
        async function (e) {

            e.preventDefault();

            const email =
                document.getElementById(
                    "email"
                ).value;

            const password =
                document.getElementById(
                    "password"
                ).value;

            const confirmPassword =
                document.getElementById(
                    "confirmPassword"
                ).value;

            const role =
                document.getElementById(
                    "role"
                ).value;

            if (
                password !== confirmPassword
            ) {

                showMessage(
                    "message",
                    "error",
                    "Passwords do not match"
                );

                return;
            }

            try {

                const response =
                    await fetch(
                        "/api/register",
                        {
                            method: "POST",

                            headers: {
                                "Content-Type":
                                    "application/json"
                            },

                            body: JSON.stringify({

                                email,
                                password,
                                role
                            })
                        }
                    );

                const data =
                    await response.json();

                if (response.ok) {

                    showMessage(
                        "message",
                        "success",
                        "Registration Successful"
                    );

                    registerForm.reset();

                    setTimeout(() => {

                        window.location.href =
                            "/";

                    }, 1500);

                } else {

                    showMessage(
                        "message",
                        "error",
                        data.error
                    );
                }

            } catch (error) {

                showMessage(
                    "message",
                    "error",
                    "Server Error"
                );
            }
        });
}