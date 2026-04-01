import { PrismaClient, AssetStatus, ActionType, UserRole } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Iniciando seed...\n");

  await prisma.traceLog.deleteMany();
  await prisma.asset.deleteMany();
  await prisma.user.deleteMany();
  await prisma.category.deleteMany();

  // Categorias
  const categories = await prisma.category.createManyAndReturn({
    data: [
      { name: "Notebook",    description: "Computadores portáteis corporativos" },
      { name: "Tablet",      description: "Dispositivos móveis e tablets" },
      { name: "Câmera",      description: "Equipamentos fotográficos e de vídeo" },
      { name: "Veículo",     description: "Frota de veículos corporativos" },
      { name: "Ferramenta",  description: "Ferramentas e equipamentos de campo" },
    ],
  });
  const catMap = Object.fromEntries(categories.map((c) => [c.name, c.id]));
  console.log(`✓ ${categories.length} categorias`);

  // Usuários (senha padrão: Trace@2024)
  const hash = await bcrypt.hash("Trace@2024", 10);
  const users = await prisma.user.createManyAndReturn({
    data: [
      { name: "Admin Sistema",  email: "admin@trace.io",    role: UserRole.Admin,    password: hash },
      { name: "Ana Lima",       email: "ana@trace.io",      role: UserRole.Operator, password: hash },
      { name: "Carlos Mota",    email: "carlos@trace.io",   role: UserRole.Operator, password: hash },
      { name: "Beatriz Neves",  email: "bea@trace.io",      role: UserRole.Operator, password: hash },
      { name: "Rafael Matos",   email: "rafael@trace.io",   role: UserRole.Operator, password: hash },
      { name: "Fernanda Costa", email: "fernanda@trace.io", role: UserRole.Viewer,   password: hash },
    ],
  });
  const uMap = Object.fromEntries(users.map((u) => [u.email, u.id]));
  console.log(`✓ ${users.length} usuários (senha padrão: Trace@2024)`);

  // Ativos
  const assetsRaw = [
    { sn: "SN-010137", name: "ThinkPad X1 Carbon Gen 11",  status: "Available"   as AssetStatus, loc: "Depósito Central",  cat: "Notebook",   desc: "16GB RAM, 512GB SSD, i7-1365U" },
    { sn: "SN-010274", name: 'MacBook Pro 14" M3 Pro',      status: "In_Use"      as AssetStatus, loc: "Sala A-101",        cat: "Notebook",   desc: "18GB RAM, 512GB SSD" },
    { sn: "SN-010411", name: "Dell XPS 15 9530",            status: "Maintenance" as AssetStatus, loc: "Setor TI",          cat: "Notebook",   desc: "32GB RAM, 1TB SSD" },
    { sn: "SN-010548", name: "HP EliteBook 840 G10",        status: "Available"   as AssetStatus, loc: "Depósito Central",  cat: "Notebook" },
    { sn: "SN-010685", name: "Lenovo IdeaPad 5 Pro",        status: "Maintenance" as AssetStatus, loc: "Setor TI",          cat: "Notebook" },
    { sn: "SN-010822", name: "ASUS ZenBook 14 OLED",        status: "Available"   as AssetStatus, loc: "Depósito Central",  cat: "Notebook" },
    { sn: "SN-010959", name: 'iPad Pro 12.9" M2',           status: "Available"   as AssetStatus, loc: "Depósito Central",  cat: "Tablet",     desc: "256GB WiFi+5G" },
    { sn: "SN-011096", name: "Surface Pro 9 i7",            status: "In_Use"      as AssetStatus, loc: "Filial SP",         cat: "Tablet" },
    { sn: "SN-011233", name: "Samsung Galaxy Tab S9 Ultra", status: "In_Use"      as AssetStatus, loc: "Auditório B",       cat: "Tablet" },
    { sn: "SN-011370", name: "Sony A7 IV",                  status: "Available"   as AssetStatus, loc: "Depósito Central",  cat: "Câmera",     desc: "33MP Full-Frame" },
    { sn: "SN-011507", name: "Canon EOS R5",                status: "In_Use"      as AssetStatus, loc: "Campo - Obra 7",    cat: "Câmera",     desc: "45MP, 8K RAW" },
    { sn: "SN-011644", name: "DJI Osmo Action 4",           status: "Available"   as AssetStatus, loc: "Depósito Central",  cat: "Câmera" },
    { sn: "SN-011781", name: "Toyota Hilux SRX 4x4",        status: "Available"   as AssetStatus, loc: "Garagem Principal", cat: "Veículo",    desc: "Placa ABC-1234, 2023" },
    { sn: "SN-011918", name: "Mercedes Sprinter 415 CDI",   status: "Maintenance" as AssetStatus, loc: "Oficina Externa",   cat: "Veículo",    desc: "Placa DEF-5678, 2022" },
    { sn: "SN-012055", name: "Ford Ranger Limited 4x4",     status: "In_Use"      as AssetStatus, loc: "Campo - Obra 12",   cat: "Veículo",    desc: "Placa GHI-9012, 2023" },
    { sn: "SN-012192", name: "Estação Total Leica TS16",    status: "Available"   as AssetStatus, loc: "Depósito Central",  cat: "Ferramenta", desc: "Precisão 1\", 3000m" },
    { sn: "SN-012329", name: "Drone DJI Matrice 300 RTK",   status: "In_Use"      as AssetStatus, loc: "Campo - Obra 5",    cat: "Ferramenta", desc: "Inspeção aérea industrial" },
  ];

  const assets = await prisma.asset.createManyAndReturn({
    data: assetsRaw.map((a) => ({
      serialNumber:    a.sn,
      name:            a.name,
      status:          a.status,
      currentLocation: a.loc,
      categoryId:      catMap[a.cat],
      description:     a.desc,
      lastMovementAt:  new Date(Date.now() - Math.random() * 7 * 86_400_000),
    })),
  });
  const assetMap = Object.fromEntries(assets.map((a) => [a.serialNumber, a.id]));
  console.log(`✓ ${assets.length} ativos`);

  // Trace Logs
  const day = 86_400_000;
  const now = Date.now();
  const logs = [
    { sn: "SN-010274", u: "admin@trace.io", a: ActionType.Check_In,          d: 15, notes: "Recebido do fornecedor. Primeiro registro." },
    { sn: "SN-010274", u: "rafael@trace.io",a: ActionType.Maintenance_Start, d: 12, notes: "Instalação de software corporativo." },
    { sn: "SN-010274", u: "rafael@trace.io",a: ActionType.Maintenance_End,   d: 11, notes: "Configuração concluída. macOS + Microsoft instalados." },
    { sn: "SN-010274", u: "ana@trace.io",   a: ActionType.Check_Out,         d: 8,  notes: "Reunião com cliente Acme Corp.", loc: "Sala A-101" },
    { sn: "SN-010274", u: "ana@trace.io",   a: ActionType.Check_In,          d: 7,  notes: "Devolvido sem avarias.", loc: "Depósito Central" },
    { sn: "SN-010274", u: "bea@trace.io",   a: ActionType.Check_Out,         d: 3,  notes: "Treinamento interno de onboarding.", loc: "Auditório B" },
    { sn: "SN-010274", u: "bea@trace.io",   a: ActionType.Check_In,          d: 3,  notes: "Devolvido após treinamento.", loc: "Depósito Central" },
    { sn: "SN-010274", u: "carlos@trace.io",a: ActionType.Check_Out,         d: 0,  notes: "Home office - semana de trabalho remoto.", loc: "Sala A-101" },

    { sn: "SN-010411", u: "carlos@trace.io",a: ActionType.Check_Out,         d: 20, notes: "Uso em campo.", loc: "Campo - Obra 3" },
    { sn: "SN-010411", u: "carlos@trace.io",a: ActionType.Check_In,          d: 18, notes: "Devolvido. Tecla F5 com defeito.", loc: "Depósito Central" },
    { sn: "SN-010411", u: "rafael@trace.io",a: ActionType.Maintenance_Start, d: 17, notes: "Teclado em reparo. Peça solicitada." },

    { sn: "SN-011781", u: "admin@trace.io", a: ActionType.Check_In,          d: 30, notes: "Veículo incorporado ao patrimônio." },
    { sn: "SN-011781", u: "carlos@trace.io",a: ActionType.Check_Out,         d: 20, notes: "Inspeção de campo - Obra 7.", loc: "Campo - Obra 7" },
    { sn: "SN-011781", u: "carlos@trace.io",a: ActionType.Check_In,          d: 18, notes: "Devolvido. KM: 45.230.", loc: "Garagem Principal" },
    { sn: "SN-011781", u: "ana@trace.io",   a: ActionType.Maintenance_Start, d: 14, notes: "Revisão preventiva: óleo + filtros." },
    { sn: "SN-011781", u: "rafael@trace.io",a: ActionType.Maintenance_End,   d: 13, notes: "Concluída. Próxima em 5.000 km." },
    { sn: "SN-011781", u: "bea@trace.io",   a: ActionType.Check_Out,         d: 5,  notes: "Visita técnica cliente Beta S/A.", loc: "Filial SP" },
    { sn: "SN-011781", u: "bea@trace.io",   a: ActionType.Check_In,          d: 4,  notes: "Retorno. KM: 45.890.", loc: "Garagem Principal" },

    { sn: "SN-011918", u: "carlos@trace.io",a: ActionType.Check_Out,         d: 10, notes: "Transporte de materiais - Obra 12.", loc: "Campo - Obra 12" },
    { sn: "SN-011918", u: "carlos@trace.io",a: ActionType.Check_In,          d: 8,  notes: "Pane no painel. Problema elétrico.", loc: "Garagem Principal" },
    { sn: "SN-011918", u: "rafael@trace.io",a: ActionType.Maintenance_Start, d: 7,  notes: "Enviado à oficina. Diagnóstico: módulo ECU." },
  ];

  for (const l of logs) {
    await prisma.traceLog.create({
      data: {
        assetId:          assetMap[l.sn],
        userId:           uMap[l.u],
        actionType:       l.a,
        timestamp:        new Date(now - l.d * day),
        notes:            l.notes,
        locationSnapshot: l.loc,
      },
    });
  }
  console.log(`✓ ${logs.length} registros de rastreabilidade`);
  console.log("\n✅ Seed concluído!\n");
}

main()
  .catch((e) => { console.error("❌ Erro:", e); process.exit(1); })
  .finally(() => prisma.$disconnect());
