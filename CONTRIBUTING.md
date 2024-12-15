# Contributing to MongoScope

First off, thank you for considering contributing to MongoScope! It's people like you that make MongoScope such a great tool.

## Code of Conduct

By participating in this project, you are expected to uphold our Code of Conduct. Please report unacceptable behavior to [your-email].

## How Can I Contribute?

### Reporting Bugs

Before creating bug reports, please check the issue list as you might find out that you don't need to create one. When you are creating a bug report, please include as many details as possible:

* Use a clear and descriptive title
* Describe the exact steps which reproduce the problem
* Provide specific examples to demonstrate the steps
* Describe the behavior you observed after following the steps
* Explain which behavior you expected to see instead and why
* Include screenshots if possible

### Suggesting Enhancements

Enhancement suggestions are tracked as GitHub issues. When creating an enhancement suggestion, please include:

* Use a clear and descriptive title
* Provide a step-by-step description of the suggested enhancement
* Provide specific examples to demonstrate the steps
* Describe the current behavior and explain which behavior you expected to see instead
* Explain why this enhancement would be useful

### Pull Requests

* Fill in the required template
* Do not include issue numbers in the PR title
* Follow the JavaScript styleguide
* Include thoughtfully-worded, well-structured tests
* Document new code
* End all files with a newline

## Development Process

1. Fork the repo
2. Create a new branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Commit your changes (`git commit -m 'Add some amazing feature'`)
5. Push to the branch (`git push origin feature/amazing-feature`)
6. Open a Pull Request

### Setup Development Environment

```bash
# Clone your fork
git clone https://github.com/your-username/mongoscope.git

# Install dependencies
npm install

# Run tests
npm test

# Start development server
npm start
```

## Styleguides

### Git Commit Messages

* Use the present tense ("Add feature" not "Added feature")
* Use the imperative mood ("Move cursor to..." not "Moves cursor to...")
* Limit the first line to 72 characters or less
* Reference issues and pull requests liberally after the first line

### JavaScript Styleguide

* Use 2 spaces for indentation
* Use semicolons
* Use `const` for all of your references; avoid using `var`
* Use template literals instead of string concatenation
* Use meaningful variable names
* Document using JSDoc comments

### Documentation Styleguide

* Use [Markdown](https://daringfireball.net/projects/markdown)
* Reference methods and classes in markdown using the following syntax:
    * Class: `{ClassName}`
    * Method: `{ClassName.methodName}`
    * Event: `{event.name}`

## Project Structure

```
mongoscope/
├── src/               # Source code
│   ├── analyzer/      # MongoDB analysis logic
│   ├── ui/           # Dashboard UI components
│   └── index.js      # Main entry point
├── types/            # TypeScript definitions
```


## Additional Notes

### Issue and Pull Request Labels

| Label | Description |
|-------|-------------|
| `bug` | Confirmed bugs or reports likely to be bugs |
| `enhancement` | Feature requests |
| `documentation` | Documentation improvements |
| `help-wanted` | Extra attention needed |
| `good first issue` | Good for newcomers |

## Recognition

Contributors who add significant value will be recognized in the project README.

## Questions?

Feel free to open an issue with your question or contact the maintainers directly.

Thank you for contributing! 🎉
