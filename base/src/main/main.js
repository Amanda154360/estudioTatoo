const { app, BrowserWindow, Menu, dialog, ipcMain } = require("electron");
const path = require("path");
const fs = require("fs");
const conexao = require("./conexao");

const pastaSessao = path.join(app.getPath("appData"), "a11s02", "session");
fs.mkdirSync(pastaSessao, { recursive: true });
app.setPath("sessionData", pastaSessao);

const testarConexaoBanco = () => {
  try {
    conexao.connect((erro) => {
      if (erro) {
        console.error("Erro assíncrono ao conectar ao MySQL:", erro.message);
        if (dialog) {
          dialog.showErrorBox(
            "Erro de conexão com o banco",
            `Não foi possível conectar ao MySQL.\n\nDetalhes: ${erro.message}`,
          );
        }
        return;
      }
      console.log("Conectado ao MySQL com sucesso!");
    });
  } catch (excecao) {
    console.error("Erro síncrono fatal ao tentar conectar:", excecao);
    if (dialog) {
      dialog.showErrorBox(
        "Falha Crítica",
        `O código quebrou antes de tentar a conexão:\n\n${excecao.message}`,
      );
    }
  }
};

const abrirModalConsole = (janelaPai, console_ = null) => {
  const janelaModal = new BrowserWindow({
    width: 500,
    height: 600,
    parent: janelaPai,
    modal: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
    },
  });

  janelaModal.loadFile(path.join(__dirname, "../renderer/frmConsole.html"));
  janelaModal.webContents.openDevTools();

  if (console_) {
    janelaModal.webContents.once("did-finish-load", () => {
      janelaModal.webContents.send("console:preencher", console_);
    });
  }
};

const abrirModalJogo = (janelaPrincipal, jogo = null) => {
  const janelaModal = new BrowserWindow({
    width: 400,
    height: 600,
    parent: janelaPrincipal,
    modal: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
    }
  });

  janelaModal.removeMenu();
  janelaModal.loadFile(path.join(__dirname, "../renderer/frmJogo.html"));
  janelaModal.webContents.openDevTools();

  if (jogo) {
    janelaModal.webContents.once("did-finish-load", () => {
      janelaModal.webContents.send("jogo:preencher", jogo);
    });
  }
};

const criarJanelaPrincipal = () => {
  const janelaPrincipal = new BrowserWindow({
    width: 1000,
    height: 700,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
    },
  });

  janelaPrincipal.loadFile(
    path.join(__dirname, "../renderer/frmPrincipal.html"),
  );
  janelaPrincipal.webContents.openDevTools();
  return janelaPrincipal;
};

const criarMenuPrincipal = (janelaPrincipal) => {
  const templateDoMenu = [
    {
      label: "Cadastros",
      submenu: [
        { label: "Console", click: () => abrirModalConsole(janelaPrincipal) },
        { label: "Jogo", click: () => abrirModalJogo(janelaPrincipal) },
      ],
    },
    {
      label: "Sistema",
      submenu: [
        {
          label: "Sair Imediatamente",
          role: "quit",
          accelerator: "CmdOrCtrl+Q",
        },
      ],
    },
  ];

  const menuReal = Menu.buildFromTemplate(templateDoMenu);
  Menu.setApplicationMenu(menuReal);
};

app.whenReady().then(() => {
  testarConexaoBanco();

  const janelaPrincipal = criarJanelaPrincipal();

  criarMenuPrincipal(janelaPrincipal);

  ipcMain.handle("console:criar", (evento, console_) => {
    return new Promise((resolve, reject) => {
      const sql =
        "INSERT INTO console (titulo, empresa, ano_lancamento) VALUES (?, ?, ?)";

      conexao.query(
        sql,
        [console_.titulo, console_.empresa, console_.ano_lancamento],
        (erro, resultado) => {
          if (erro) {
            reject(erro);
            return;
          }
          resolve({ id: resultado.insertId, ...console_ });
        },
      );
    });
  });

  ipcMain.handle("console:listar", () => {
    return new Promise((resolve, reject) => {
      const sql = "SELECT * FROM console ORDER BY ano_lancamento DESC";

      conexao.query(sql, (erro, resultado) => {
        if (erro) {
          reject(erro);
          return;
        }
        resolve(resultado);
      });
    });
  });

  ipcMain.handle("console:atualizar", (evento, console_) => {
    return new Promise((resolve, reject) => {
      const sql =
        "UPDATE console SET titulo = ?, empresa = ?, ano_lancamento = ? WHERE id = ?";
      const valores = [
        console_.titulo,
        console_.empresa,
        console_.ano_lancamento,
        console_.id,
      ];

      conexao.query(sql, valores, (erro, resultado) => {
        if (erro) {
          reject(erro);
        } else {
          resolve(resultado);
        }
      });
    });
  });

  ipcMain.on("console:abrirEdicao", (evento, console_) => {
    abrirModalConsole(janelaPrincipal, console_);
  });

  ipcMain.handle("console:excluir", (evento, id) => {
    return new Promise((resolve, reject) => {
      const sql = "DELETE FROM console WHERE id = ?";

      conexao.query(sql, [id], (erro, resultado) => {
        if (erro) {
          reject(erro);
          return;
        }
        resolve(resultado);
      });
    });
  });

   ipcMain.handle("jogo:criar", (evento, jogo_) => {
    return new Promise((resolve, reject) => {
      const sql =
        "INSERT INTO jogo (titulo, genero, tipo_midia, ano_lancamento) VALUES (?, ?, ?, ?)";

      conexao.query(
        sql,
        [jogo_.titulo, jogo_.genero, jogo_.tipo_midia, jogo_.ano_lancamento],
        (erro, resultado) => {
          if (erro) {
            reject(erro);
            return;
          }
          resolve({ id: resultado.insertId, ...jogo_});
        },
      );
    });
  });

  ipcMain.handle("jogo:listar", () => {
    return new Promise((resolve, reject) => {
      const sql = "SELECT * FROM jogo ORDER BY ano_lancamento DESC";

      conexao.query(sql, (erro, resultado) => {
        if (erro) {
          reject(erro);
          return;
        }
        resolve(resultado);
      });
    });
  });

  ipcMain.handle("jogo:atualizar", (evento, jogo_) => {
    return new Promise((resolve, reject) => {
      const sql =
        "UPDATE jogo SET titulo = ?, genero = ?, tipo_midia = ?, ano_lancamento = ? WHERE id = ?";
      const valores = [
        jogo_.titulo,
        jogo_.genero,
        jogo_.tipo_midia,
        jogo_.ano_lancamento,
        jogo_.id,
      ];

      conexao.query(sql, valores, (erro, resultado) => {
        if (erro) {
          reject(erro);
        } else {
          resolve(resultado);
        }
      });
    });
  });

  ipcMain.on("jogo:abrirEdicaoJogo", (evento, jogo_) => {
    abrirModalJogo(janelaPrincipal, jogo_);
  });

  ipcMain.handle("jogo:excluir", (evento, id) => {
    return new Promise((resolve, reject) => {
      const sql = "DELETE FROM jogo WHERE id = ?";

      conexao.query(sql, [id], (erro, resultado) => {
        if (erro) {
          reject(erro);
          return;
        }
        resolve(resultado);
      });
    });
  });
});
