import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import './App.css';
import Playground from './components/Playground';

const App: React.FC = () => {
  const scrollToSection = (e: React.MouseEvent<HTMLAnchorElement>, sectionId: string) => {
    e.preventDefault();
    const element = document.getElementById(sectionId);
    if (element) {
      const navbarHeight = document.querySelector('.navbar')?.clientHeight || 0;
      const elementPosition = element.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - navbarHeight;

      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      });
    }
  };

  const Home = () => (
    <div className="app">
      <nav className="navbar">
        <div className="nav-brand">Logic Gates Explorer</div>
        <div className="nav-links">
          <a href="#basic" onClick={(e) => scrollToSection(e, 'basic')}>Basic Gates</a>
          <a href="#advanced" onClick={(e) => scrollToSection(e, 'advanced')}>Advanced Gates</a>
          <a href="#applications" onClick={(e) => scrollToSection(e, 'applications')}>Applications</a>
          <Link to="/playground" className="playground-link">Playground</Link>
        </div>
      </nav>

      <header className="hero">
        <h1>Understanding Logic Gates</h1>
        <p>Building blocks of digital electronics and computer systems</p>
      </header>

      <main className="content">
        <div className="playground-section">
          <h2>Interactive Playground</h2>
          <p>Experiment with logic gates in our interactive circuit creator. Build, test, and learn how different combinations of gates work together.</p>
          <Link to="/playground" className="playground-button">
            Launch Playground
          </Link>
        </div>

        <section id="basic" className="section">
          <h2>Basic Logic Gates</h2>
          <div className="gates-grid">
            <div className="gate-card">
              <h3>AND Gate</h3>
              <div className="gate-symbol">AND</div>
              <p>Outputs true only when all inputs are true</p>
              <div className="truth-table">
                <table>
                  <thead>
                    <tr>
                      <th>A</th>
                      <th>B</th>
                      <th>Output</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr><td>0</td><td>0</td><td>0</td></tr>
                    <tr><td>0</td><td>1</td><td>0</td></tr>
                    <tr><td>1</td><td>0</td><td>0</td></tr>
                    <tr><td>1</td><td>1</td><td>1</td></tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div className="gate-card">
              <h3>OR Gate</h3>
              <div className="gate-symbol">OR</div>
              <p>Outputs true when any input is true</p>
              <div className="truth-table">
                <table>
                  <thead>
                    <tr>
                      <th>A</th>
                      <th>B</th>
                      <th>Output</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr><td>0</td><td>0</td><td>0</td></tr>
                    <tr><td>0</td><td>1</td><td>1</td></tr>
                    <tr><td>1</td><td>0</td><td>1</td></tr>
                    <tr><td>1</td><td>1</td><td>1</td></tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div className="gate-card">
              <h3>NOT Gate</h3>
              <div className="gate-symbol">NOT</div>
              <p>Inverts the input signal</p>
              <div className="truth-table">
                <table>
                  <thead>
                    <tr>
                      <th>Input</th>
                      <th>Output</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr><td>0</td><td>1</td></tr>
                    <tr><td>1</td><td>0</td></tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </section>

        <section id="advanced" className="section">
          <h2>Advanced Logic Gates</h2>
          <div className="gates-grid">
            <div className="gate-card">
              <h3>NAND Gate</h3>
              <div className="gate-symbol">NAND</div>
              <p>AND gate followed by NOT gate</p>
              <div className="truth-table">
                <table>
                  <thead>
                    <tr>
                      <th>A</th>
                      <th>B</th>
                      <th>Output</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr><td>0</td><td>0</td><td>1</td></tr>
                    <tr><td>0</td><td>1</td><td>1</td></tr>
                    <tr><td>1</td><td>0</td><td>1</td></tr>
                    <tr><td>1</td><td>1</td><td>0</td></tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div className="gate-card">
              <h3>NOR Gate</h3>
              <div className="gate-symbol">NOR</div>
              <p>OR gate followed by NOT gate</p>
              <div className="truth-table">
                <table>
                  <thead>
                    <tr>
                      <th>A</th>
                      <th>B</th>
                      <th>Output</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr><td>0</td><td>0</td><td>1</td></tr>
                    <tr><td>0</td><td>1</td><td>0</td></tr>
                    <tr><td>1</td><td>0</td><td>0</td></tr>
                    <tr><td>1</td><td>1</td><td>0</td></tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div className="gate-card">
              <h3>XOR Gate</h3>
              <div className="gate-symbol">XOR</div>
              <p>Outputs true when inputs are different</p>
              <div className="truth-table">
                <table>
                  <thead>
                    <tr>
                      <th>A</th>
                      <th>B</th>
                      <th>Output</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr><td>0</td><td>0</td><td>0</td></tr>
                    <tr><td>0</td><td>1</td><td>1</td></tr>
                    <tr><td>1</td><td>0</td><td>1</td></tr>
                    <tr><td>1</td><td>1</td><td>0</td></tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </section>

        <section id="applications" className="section">
          <h2>Applications</h2>
          <div className="applications-grid">
            <div className="application-card">
              <h3>Digital Circuits</h3>
              <p>Logic gates are fundamental building blocks in digital circuits, used to create complex systems like processors and memory units.</p>
            </div>
            <div className="application-card">
              <h3>Computer Architecture</h3>
              <p>Modern computers use combinations of logic gates to perform arithmetic operations and make decisions.</p>
            </div>
            <div className="application-card">
              <h3>Control Systems</h3>
              <p>Logic gates are used in control systems to implement decision-making processes and automate operations.</p>
            </div>
          </div>
        </section>
      </main>

      <footer className="footer">
        <p>© 2024 Logic Gates Explorer | Learn Digital Electronics</p>
      </footer>
    </div>
  );

  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/playground" element={<Playground />} />
      </Routes>
    </Router>
  );
};

export default App;
