/*
 * Auto-generated from Data/crm_seed_dataset.xlsx
 * Source sheets: Employees, Companies, Contacts, Events, MeetingTargets
 */

export interface BaseEmployeeSeedRow {
  employeeId: string;
  firstName: string;
  lastName: string;
  title: string;
  department: string;
  managerId?: string;
  country: string;
  employmentType: string;
  email: string;
}

export interface BaseCompanySeedRow {
  companyId: string;
  companyName: string;
  country: string;
  type: string;
  region: string;
  accountManagerEmployeeId: string;
}

export interface BaseContactSeedRow {
  contactId: string;
  name: string;
  companyId: string;
  title: string;
  email?: string;
}

export interface BaseEventSeedRow {
  eventId: string;
  eventName: string;
  city: string;
  region: string;
  approxMonth: string;
}

export interface BaseMeetingTargetSeedRow {
  employeeId: string;
  companyId: string;
  eventId: string;
  priority: string;
}

export const BASE_EMPLOYEE_ROWS: BaseEmployeeSeedRow[] = [
  {
    "employeeId": "emp-001",
    "firstName": "Akram",
    "lastName": "Mohammad beiki",
    "title": "CEO",
    "department": "Product Development",
    "managerId": null,
    "country": "Turkey",
    "employmentType": "Full-time",
    "email": "akram.mohammad.beiki@devotel.io"
  },
  {
    "employeeId": "emp-002",
    "firstName": "Alexi",
    "lastName": "Dermosessian",
    "title": "Head of Branding & Marketing",
    "department": "Branding & Marketing",
    "managerId": "emp-001",
    "country": "Turkey",
    "employmentType": "Full-time",
    "email": "alexi.dermosessian@devotel.io"
  },
  {
    "employeeId": "emp-003",
    "firstName": "Arlen",
    "lastName": "Saroyan",
    "title": "Head of Telecom Operations",
    "department": "Telecom Operations",
    "managerId": "emp-001",
    "country": "Turkey",
    "employmentType": "Full-time",
    "email": "arlen.saroyan@devotel.io"
  },
  {
    "employeeId": "emp-004",
    "firstName": "Farid",
    "lastName": "Nami",
    "title": "Graphic Designer",
    "department": "Branding & Marketing",
    "managerId": "emp-002",
    "country": "Turkey",
    "employmentType": "Full-time",
    "email": "farid.nami@devotel.io"
  },
  {
    "employeeId": "emp-005",
    "firstName": "Hojjat",
    "lastName": "Orangi",
    "title": "Rate & Routing Engineer",
    "department": "Telecom Operations",
    "managerId": "emp-003",
    "country": "Turkey",
    "employmentType": "Full-time",
    "email": "hojjat.orangi@devotel.io"
  },
  {
    "employeeId": "emp-006",
    "firstName": "Malihe",
    "lastName": "Kia",
    "title": "Head of Operations",
    "department": "Operations",
    "managerId": "emp-001",
    "country": "Turkey",
    "employmentType": "Full-time",
    "email": "malihe.kia@devotel.io"
  },
  {
    "employeeId": "emp-007",
    "firstName": "Maryam",
    "lastName": "Kamandani",
    "title": "Head of Product Development",
    "department": "Product Development",
    "managerId": "emp-001",
    "country": "Turkey",
    "employmentType": "Full-time",
    "email": "maryam.kamandani@devotel.io"
  },
  {
    "employeeId": "emp-008",
    "firstName": "Mohammedreza",
    "lastName": "Rahmini",
    "title": "Support & NOC Engineer",
    "department": "Telecom Operations",
    "managerId": "emp-003",
    "country": "Turkey",
    "employmentType": "Full-time",
    "email": "mohammedreza.rahmini@devotel.io"
  },
  {
    "employeeId": "emp-009",
    "firstName": "Saeedeh",
    "lastName": "Imani Tehrani",
    "title": "Product Manager",
    "department": "Product Development",
    "managerId": "emp-007",
    "country": "Turkey",
    "employmentType": "Full-time",
    "email": "saeedeh.imani.tehrani@devotel.io"
  },
  {
    "employeeId": "emp-010",
    "firstName": "Armin",
    "lastName": "Akbari",
    "title": "Head of Software Development",
    "department": "Software Development",
    "managerId": "emp-001",
    "country": "Turkey",
    "employmentType": "Full-time",
    "email": "armin.akbari@devotel.io"
  },
  {
    "employeeId": "emp-011",
    "firstName": "Mohammad",
    "lastName": "Fattahi",
    "title": "Backend Developer",
    "department": "Software Development",
    "managerId": "emp-010",
    "country": "Turkey",
    "employmentType": "Full-time",
    "email": "mohammad.fattahi@devotel.io"
  },
  {
    "employeeId": "emp-012",
    "firstName": "Ali",
    "lastName": "Erem Gökçe",
    "title": "Support & NOC Engineer",
    "department": "Telecom Operations",
    "managerId": "emp-003",
    "country": "Turkey",
    "employmentType": "Full-time",
    "email": "ali.erem.gökçe@devotel.io"
  },
  {
    "employeeId": "emp-013",
    "firstName": "Alperen",
    "lastName": "Akkurt",
    "title": "Full Stack Developer",
    "department": "Software Development",
    "managerId": "emp-010",
    "country": "Turkey",
    "employmentType": "Full-time",
    "email": "alperen.akkurt@devotel.io"
  },
  {
    "employeeId": "emp-014",
    "firstName": "Badegül",
    "lastName": "Özcan",
    "title": "Office Admin",
    "department": "Operations",
    "managerId": "emp-006",
    "country": "Turkey",
    "employmentType": "Full-time",
    "email": "badegül.özcan@devotel.io"
  },
  {
    "employeeId": "emp-015",
    "firstName": "Berk",
    "lastName": "Poyraz",
    "title": "Head of Management",
    "department": "Management",
    "managerId": "emp-001",
    "country": "Turkey",
    "employmentType": "Full-time",
    "email": "berk.poyraz@devotel.io"
  },
  {
    "employeeId": "emp-016",
    "firstName": "Bilal",
    "lastName": "Adak",
    "title": "Head of Product Development",
    "department": "Product Development",
    "managerId": "emp-007",
    "country": "UK",
    "employmentType": "Full-time",
    "email": "bilal.adak@devotel.io"
  },
  {
    "employeeId": "emp-017",
    "firstName": "Bilal",
    "lastName": "Yakut",
    "title": "Office Admin",
    "department": "Operations",
    "managerId": "emp-006",
    "country": "Turkey",
    "employmentType": "Full-time",
    "email": "bilal.yakut@devotel.io"
  },
  {
    "employeeId": "emp-018",
    "firstName": "Bosko",
    "lastName": "Djurica",
    "title": "Head of Business Development & Sales",
    "department": "Business Development & Sales",
    "managerId": "emp-001",
    "country": "Serbia",
    "employmentType": "Full-time",
    "email": "bosko.djurica@devotel.io"
  },
  {
    "employeeId": "emp-019",
    "firstName": "Ceren",
    "lastName": "Talay",
    "title": "Account Manager",
    "department": "Business Development & Sales",
    "managerId": "emp-018",
    "country": "Turkey",
    "employmentType": "Full-time",
    "email": "ceren.talay@devotel.io"
  },
  {
    "employeeId": "emp-020",
    "firstName": "Chad",
    "lastName": "Gurpinar",
    "title": "COO",
    "department": "Management",
    "managerId": "emp-015",
    "country": "UK",
    "employmentType": "Full-time",
    "email": "chad.gurpinar@devotel.io"
  },
  {
    "employeeId": "emp-021",
    "firstName": "Deniz",
    "lastName": "Alper",
    "title": "Support & NOC Engineer",
    "department": "Telecom Operations",
    "managerId": "emp-003",
    "country": "Turkey",
    "employmentType": "Full-time",
    "email": "deniz.alper@devotel.io"
  },
  {
    "employeeId": "emp-022",
    "firstName": "Emirhan",
    "lastName": "Abacı",
    "title": "Rate & Routing Engineer",
    "department": "Telecom Operations",
    "managerId": "emp-003",
    "country": "Turkey",
    "employmentType": "Full-time",
    "email": "emirhan.abacı@devotel.io"
  },
  {
    "employeeId": "emp-023",
    "firstName": "Emre",
    "lastName": "Çelebi",
    "title": "Account Manager",
    "department": "Business Development & Sales",
    "managerId": "emp-018",
    "country": "Turkey",
    "employmentType": "Full-time",
    "email": "emre.çelebi@devotel.io"
  },
  {
    "employeeId": "emp-024",
    "firstName": "Erol",
    "lastName": "Fedakar",
    "title": "CEO",
    "department": "Management",
    "managerId": "emp-015",
    "country": "Turkey",
    "employmentType": "Full-time",
    "email": "erol.fedakar@devotel.io"
  },
  {
    "employeeId": "emp-025",
    "firstName": "Ezgi",
    "lastName": "Dilan Ustaoğlu",
    "title": "Graphic Designer",
    "department": "Branding & Marketing",
    "managerId": "emp-002",
    "country": "Turkey",
    "employmentType": "Full-time",
    "email": "ezgi.dilan.ustaoğlu@devotel.io"
  },
  {
    "employeeId": "emp-026",
    "firstName": "Hamidreza",
    "lastName": "Javid",
    "title": "Graphic Designer",
    "department": "Branding & Marketing",
    "managerId": "emp-002",
    "country": "Turkey",
    "employmentType": "Full-time",
    "email": "hamidreza.javid@devotel.io"
  },
  {
    "employeeId": "emp-027",
    "firstName": "Hanine",
    "lastName": "Djebbi",
    "title": "Data Analyst",
    "department": "Business Development & Sales",
    "managerId": "emp-018",
    "country": "Turkey",
    "employmentType": "Full-time",
    "email": "hanine.djebbi@devotel.io"
  },
  {
    "employeeId": "emp-028",
    "firstName": "Hasan",
    "lastName": "Sarı",
    "title": "Analyst Developer",
    "department": "Operations",
    "managerId": "emp-006",
    "country": "Turkey",
    "employmentType": "Full-time",
    "email": "hasan.sarı@devotel.io"
  },
  {
    "employeeId": "emp-029",
    "firstName": "Hatice",
    "lastName": "Hilal Mirzayev",
    "title": "Account Manager",
    "department": "Business Development & Sales",
    "managerId": "emp-018",
    "country": "Turkey",
    "employmentType": "Full-time",
    "email": "hatice.hilal.mirzayev@devotel.io"
  },
  {
    "employeeId": "emp-030",
    "firstName": "Hatice",
    "lastName": "Kübra Kaya",
    "title": "HR Specialist",
    "department": "Operations",
    "managerId": "emp-006",
    "country": "Turkey",
    "employmentType": "Full-time",
    "email": "hatice.kübra.kaya@devotel.io"
  },
  {
    "employeeId": "emp-031",
    "firstName": "İbrahim",
    "lastName": "Burak Sinan",
    "title": "Rate & Routing Engineer",
    "department": "Telecom Operations",
    "managerId": "emp-003",
    "country": "Turkey",
    "employmentType": "Full-time",
    "email": "i̇brahim.burak.sinan@devotel.io"
  },
  {
    "employeeId": "emp-032",
    "firstName": "Ida",
    "lastName": "Curovac",
    "title": "Account Executive",
    "department": "Business Development & Sales",
    "managerId": "emp-018",
    "country": "Bosnia",
    "employmentType": "Full-time",
    "email": "ida.curovac@devotel.io"
  },
  {
    "employeeId": "emp-033",
    "firstName": "Ihsan",
    "lastName": "John Mashari",
    "title": "Finance Manager",
    "department": "Operations",
    "managerId": "emp-006",
    "country": "UK",
    "employmentType": "Full-time",
    "email": "ihsan.john.mashari@devotel.io"
  },
  {
    "employeeId": "emp-034",
    "firstName": "Julia",
    "lastName": "Ayres",
    "title": "Brand & Marketing Strategy Manager",
    "department": "Branding & Marketing",
    "managerId": "emp-002",
    "country": "Spain",
    "employmentType": "Full-time",
    "email": "julia.ayres@devotel.io"
  },
  {
    "employeeId": "emp-035",
    "firstName": "Marzie",
    "lastName": "Kia",
    "title": "Account Manager",
    "department": "Business Development & Sales",
    "managerId": "emp-018",
    "country": "Turkey",
    "employmentType": "Full-time",
    "email": "marzie.kia@devotel.io"
  },
  {
    "employeeId": "emp-036",
    "firstName": "Mate",
    "lastName": "Jelenic",
    "title": "BD & Sales Director",
    "department": "Business Development & Sales",
    "managerId": "emp-018",
    "country": "Croatia",
    "employmentType": "Full-time",
    "email": "mate.jelenic@devotel.io"
  },
  {
    "employeeId": "emp-037",
    "firstName": "Metehan",
    "lastName": "Gelen",
    "title": "Account Manager",
    "department": "Business Development & Sales",
    "managerId": "emp-018",
    "country": "Turkey",
    "employmentType": "Full-time",
    "email": "metehan.gelen@devotel.io"
  },
  {
    "employeeId": "emp-038",
    "firstName": "Mohsen",
    "lastName": "Soltani",
    "title": "Accounting Specialist",
    "department": "Operations",
    "managerId": "emp-006",
    "country": "Turkey",
    "employmentType": "Full-time",
    "email": "mohsen.soltani@devotel.io"
  },
  {
    "employeeId": "emp-039",
    "firstName": "Nadia",
    "lastName": "Stalenko",
    "title": "Account Manager",
    "department": "Business Development & Sales",
    "managerId": "emp-018",
    "country": "Ukraine",
    "employmentType": "Full-time",
    "email": "nadia.stalenko@devotel.io"
  },
  {
    "employeeId": "emp-040",
    "firstName": "Parsa",
    "lastName": "Roudaki",
    "title": "Support & NOC Engineer",
    "department": "Telecom Operations",
    "managerId": "emp-003",
    "country": "Turkey",
    "employmentType": "Full-time",
    "email": "parsa.roudaki@devotel.io"
  },
  {
    "employeeId": "emp-041",
    "firstName": "Sirarpi",
    "lastName": "Zorikyan",
    "title": "Business Development Manager",
    "department": "Business Development & Sales",
    "managerId": "emp-018",
    "country": "Romania",
    "employmentType": "Full-time",
    "email": "sirarpi.zorikyan@devotel.io"
  },
  {
    "employeeId": "emp-042",
    "firstName": "Suat",
    "lastName": "Kitiş",
    "title": "Telecom Operations Manager",
    "department": "Telecom Operations",
    "managerId": "emp-003",
    "country": "Turkey",
    "employmentType": "Full-time",
    "email": "suat.kitiş@devotel.io"
  },
  {
    "employeeId": "emp-043",
    "firstName": "Sude",
    "lastName": "Memisoğlu",
    "title": "CEO Office Manager",
    "department": "Operations",
    "managerId": "emp-006",
    "country": "Turkey",
    "employmentType": "Full-time",
    "email": "sude.memisoğlu@devotel.io"
  },
  {
    "employeeId": "emp-044",
    "firstName": "Suzana",
    "lastName": "Zupic",
    "title": "Head of Enterprise Sales",
    "department": "Business Development & Sales",
    "managerId": "emp-018",
    "country": "Italy",
    "employmentType": "Full-time",
    "email": "suzana.zupic@devotel.io"
  },
  {
    "employeeId": "emp-045",
    "firstName": "Timur",
    "lastName": "Konyalı",
    "title": "Head Of SMS Sales",
    "department": "Business Development & Sales",
    "managerId": "emp-018",
    "country": "Turkey",
    "employmentType": "Full-time",
    "email": "timur.konyalı@devotel.io"
  },
  {
    "employeeId": "emp-046",
    "firstName": "Yakup",
    "lastName": "Ozturk",
    "title": "Office Admin",
    "department": "Operations",
    "managerId": "emp-006",
    "country": "Turkey",
    "employmentType": "Full-time",
    "email": "yakup.ozturk@devotel.io"
  },
  {
    "employeeId": "emp-047",
    "firstName": "Yaren",
    "lastName": "Tazegül",
    "title": "CEO Office Specialist",
    "department": "Operations",
    "managerId": "emp-006",
    "country": "Turkey",
    "employmentType": "Full-time",
    "email": "yaren.tazegül@devotel.io"
  },
  {
    "employeeId": "emp-048",
    "firstName": "Yiğithan",
    "lastName": "Çilingir",
    "title": "Jr Support & NOC Engineer",
    "department": "Telecom Operations",
    "managerId": "emp-003",
    "country": "Turkey",
    "employmentType": "Full-time",
    "email": "yiğithan.çilingir@devotel.io"
  },
  {
    "employeeId": "emp-049",
    "firstName": "Elif",
    "lastName": null,
    "title": "Head of -",
    "department": "-",
    "managerId": "emp-001",
    "country": "Turkey",
    "employmentType": "Full-time",
    "email": "elif@devotel.io"
  },
  {
    "employeeId": "emp-050",
    "firstName": "Aslı",
    "lastName": "Aleyna Varna",
    "title": "-",
    "department": "-",
    "managerId": "emp-049",
    "country": "Turkey",
    "employmentType": "Full-time",
    "email": "aslı.aleyna.varna@devotel.io"
  },
  {
    "employeeId": "emp-051",
    "firstName": "Ayberk",
    "lastName": "Karga",
    "title": "Intern",
    "department": "Software Development",
    "managerId": "emp-010",
    "country": "Turkey",
    "employmentType": "Full-time",
    "email": "ayberk.karga@devotel.io"
  },
  {
    "employeeId": "emp-052",
    "firstName": "Barış",
    "lastName": "Bak",
    "title": null,
    "department": null,
    "managerId": "emp-001",
    "country": "UK",
    "employmentType": "Full-time",
    "email": "barış.bak@devotel.io"
  },
  {
    "employeeId": "emp-053",
    "firstName": "Umutcan",
    "lastName": "Olgun",
    "title": null,
    "department": null,
    "managerId": "emp-001",
    "country": "UK",
    "employmentType": "Full-time",
    "email": "umutcan.olgun@devotel.io"
  }
] as BaseEmployeeSeedRow[];

export const BASE_COMPANY_ROWS: BaseCompanySeedRow[] = [
  {
    "companyId": "company-001",
    "companyName": "253 TIG",
    "country": "USA",
    "type": "MNO",
    "region": "Americas",
    "accountManagerEmployeeId": "emp-003"
  },
  {
    "companyId": "company-002",
    "companyName": "6Gtech",
    "country": "UK",
    "type": "Aggregator",
    "region": "Europe",
    "accountManagerEmployeeId": "emp-005"
  },
  {
    "companyId": "company-003",
    "companyName": "9 eons",
    "country": "Germany",
    "type": "CPaaS",
    "region": "Europe",
    "accountManagerEmployeeId": "emp-008"
  },
  {
    "companyId": "company-004",
    "companyName": "A1 Austria MNO",
    "country": "UAE",
    "type": "Enterprise",
    "region": "Middle East",
    "accountManagerEmployeeId": "emp-012"
  },
  {
    "companyId": "company-005",
    "companyName": "Acorn",
    "country": "Singapore",
    "type": "Vendor",
    "region": "Asia",
    "accountManagerEmployeeId": "emp-018"
  },
  {
    "companyId": "company-006",
    "companyName": "Activatel",
    "country": "South Africa",
    "type": "MNO",
    "region": "Africa",
    "accountManagerEmployeeId": "emp-019"
  },
  {
    "companyId": "company-007",
    "companyName": "Ada Asia",
    "country": "Brazil",
    "type": "Aggregator",
    "region": "Americas",
    "accountManagerEmployeeId": "emp-021"
  },
  {
    "companyId": "company-008",
    "companyName": "ADC",
    "country": "Turkey",
    "type": "CPaaS",
    "region": "Europe",
    "accountManagerEmployeeId": "emp-022"
  },
  {
    "companyId": "company-009",
    "companyName": "AE telco",
    "country": "USA",
    "type": "Enterprise",
    "region": "Americas",
    "accountManagerEmployeeId": "emp-023"
  },
  {
    "companyId": "company-010",
    "companyName": "Akton",
    "country": "UK",
    "type": "Vendor",
    "region": "Europe",
    "accountManagerEmployeeId": "emp-027"
  },
  {
    "companyId": "company-011",
    "companyName": "Fa",
    "country": "Germany",
    "type": "MNO",
    "region": "Europe",
    "accountManagerEmployeeId": "emp-029"
  },
  {
    "companyId": "company-012",
    "companyName": "ALKAIP",
    "country": "UAE",
    "type": "Aggregator",
    "region": "Middle East",
    "accountManagerEmployeeId": "emp-031"
  },
  {
    "companyId": "company-013",
    "companyName": "Antwerp",
    "country": "Singapore",
    "type": "CPaaS",
    "region": "Asia",
    "accountManagerEmployeeId": "emp-032"
  },
  {
    "companyId": "company-014",
    "companyName": "AVISO MESSAGING LTD",
    "country": "South Africa",
    "type": "Enterprise",
    "region": "Africa",
    "accountManagerEmployeeId": "emp-035"
  },
  {
    "companyId": "company-015",
    "companyName": "Baway",
    "country": "Brazil",
    "type": "Vendor",
    "region": "Americas",
    "accountManagerEmployeeId": "emp-036"
  },
  {
    "companyId": "company-016",
    "companyName": "BBT",
    "country": "Turkey",
    "type": "MNO",
    "region": "Europe",
    "accountManagerEmployeeId": "emp-037"
  },
  {
    "companyId": "company-017",
    "companyName": "Bharti Airtel",
    "country": "USA",
    "type": "Aggregator",
    "region": "Americas",
    "accountManagerEmployeeId": "emp-039"
  },
  {
    "companyId": "company-018",
    "companyName": "Brilliant",
    "country": "UK",
    "type": "CPaaS",
    "region": "Europe",
    "accountManagerEmployeeId": "emp-040"
  },
  {
    "companyId": "company-019",
    "companyName": "Bringo",
    "country": "Germany",
    "type": "Enterprise",
    "region": "Europe",
    "accountManagerEmployeeId": "emp-041"
  },
  {
    "companyId": "company-020",
    "companyName": "Broadnet",
    "country": "UAE",
    "type": "Vendor",
    "region": "Middle East",
    "accountManagerEmployeeId": "emp-042"
  },
  {
    "companyId": "company-021",
    "companyName": "Carrier Italy",
    "country": "Singapore",
    "type": "MNO",
    "region": "Asia",
    "accountManagerEmployeeId": "emp-044"
  },
  {
    "companyId": "company-022",
    "companyName": "Celcom",
    "country": "South Africa",
    "type": "Aggregator",
    "region": "Africa",
    "accountManagerEmployeeId": "emp-045"
  },
  {
    "companyId": "company-023",
    "companyName": "Celetel",
    "country": "Brazil",
    "type": "CPaaS",
    "region": "Americas",
    "accountManagerEmployeeId": "emp-048"
  },
  {
    "companyId": "company-024",
    "companyName": "Cequens",
    "country": "Turkey",
    "type": "Enterprise",
    "region": "Europe",
    "accountManagerEmployeeId": "emp-003"
  },
  {
    "companyId": "company-025",
    "companyName": "Chat Link",
    "country": "USA",
    "type": "Vendor",
    "region": "Americas",
    "accountManagerEmployeeId": "emp-005"
  },
  {
    "companyId": "company-026",
    "companyName": "China Mobile International",
    "country": "UK",
    "type": "MNO",
    "region": "Europe",
    "accountManagerEmployeeId": "emp-008"
  },
  {
    "companyId": "company-027",
    "companyName": "China Unicom",
    "country": "Germany",
    "type": "Aggregator",
    "region": "Europe",
    "accountManagerEmployeeId": "emp-012"
  },
  {
    "companyId": "company-028",
    "companyName": "Chrony",
    "country": "UAE",
    "type": "CPaaS",
    "region": "Middle East",
    "accountManagerEmployeeId": "emp-018"
  },
  {
    "companyId": "company-029",
    "companyName": "Click mobile",
    "country": "Singapore",
    "type": "Enterprise",
    "region": "Asia",
    "accountManagerEmployeeId": "emp-019"
  },
  {
    "companyId": "company-030",
    "companyName": "Clotech",
    "country": "South Africa",
    "type": "Vendor",
    "region": "Africa",
    "accountManagerEmployeeId": "emp-021"
  },
  {
    "companyId": "company-031",
    "companyName": "CM",
    "country": "Brazil",
    "type": "MNO",
    "region": "Americas",
    "accountManagerEmployeeId": "emp-022"
  },
  {
    "companyId": "company-032",
    "companyName": "Commpeak",
    "country": "Turkey",
    "type": "Aggregator",
    "region": "Europe",
    "accountManagerEmployeeId": "emp-023"
  },
  {
    "companyId": "company-033",
    "companyName": "Converse mobile",
    "country": "USA",
    "type": "CPaaS",
    "region": "Americas",
    "accountManagerEmployeeId": "emp-027"
  },
  {
    "companyId": "company-034",
    "companyName": "Dexatel",
    "country": "UK",
    "type": "Enterprise",
    "region": "Europe",
    "accountManagerEmployeeId": "emp-029"
  },
  {
    "companyId": "company-035",
    "companyName": "Dial Telecom",
    "country": "Germany",
    "type": "Vendor",
    "region": "Europe",
    "accountManagerEmployeeId": "emp-031"
  },
  {
    "companyId": "company-036",
    "companyName": "Direct Telco",
    "country": "UAE",
    "type": "MNO",
    "region": "Middle East",
    "accountManagerEmployeeId": "emp-032"
  },
  {
    "companyId": "company-037",
    "companyName": "Direq",
    "country": "Singapore",
    "type": "Aggregator",
    "region": "Asia",
    "accountManagerEmployeeId": "emp-035"
  },
  {
    "companyId": "company-038",
    "companyName": "Diverscom",
    "country": "South Africa",
    "type": "CPaaS",
    "region": "Africa",
    "accountManagerEmployeeId": "emp-036"
  },
  {
    "companyId": "company-039",
    "companyName": "Dotgo",
    "country": "Brazil",
    "type": "Enterprise",
    "region": "Americas",
    "accountManagerEmployeeId": "emp-037"
  },
  {
    "companyId": "company-040",
    "companyName": "DOTT",
    "country": "Turkey",
    "type": "Vendor",
    "region": "Europe",
    "accountManagerEmployeeId": "emp-039"
  },
  {
    "companyId": "company-041",
    "companyName": "Duxx",
    "country": "USA",
    "type": "MNO",
    "region": "Americas",
    "accountManagerEmployeeId": "emp-040"
  },
  {
    "companyId": "company-042",
    "companyName": "Engy",
    "country": "UK",
    "type": "Aggregator",
    "region": "Europe",
    "accountManagerEmployeeId": "emp-041"
  },
  {
    "companyId": "company-043",
    "companyName": "Etisalat",
    "country": "Germany",
    "type": "CPaaS",
    "region": "Europe",
    "accountManagerEmployeeId": "emp-042"
  },
  {
    "companyId": "company-044",
    "companyName": "Figensoft",
    "country": "UAE",
    "type": "Enterprise",
    "region": "Middle East",
    "accountManagerEmployeeId": "emp-044"
  },
  {
    "companyId": "company-045",
    "companyName": "Fortis",
    "country": "Singapore",
    "type": "Vendor",
    "region": "Asia",
    "accountManagerEmployeeId": "emp-045"
  },
  {
    "companyId": "company-046",
    "companyName": "G5 telecom",
    "country": "South Africa",
    "type": "MNO",
    "region": "Africa",
    "accountManagerEmployeeId": "emp-048"
  },
  {
    "companyId": "company-047",
    "companyName": "G729",
    "country": "Brazil",
    "type": "Aggregator",
    "region": "Americas",
    "accountManagerEmployeeId": "emp-003"
  },
  {
    "companyId": "company-048",
    "companyName": "Globetele Service ( GTS)",
    "country": "Turkey",
    "type": "CPaaS",
    "region": "Europe",
    "accountManagerEmployeeId": "emp-005"
  },
  {
    "companyId": "company-049",
    "companyName": "Globtel",
    "country": "USA",
    "type": "Enterprise",
    "region": "Americas",
    "accountManagerEmployeeId": "emp-008"
  },
  {
    "companyId": "company-050",
    "companyName": "Go4Mobility",
    "country": "UK",
    "type": "Vendor",
    "region": "Europe",
    "accountManagerEmployeeId": "emp-012"
  },
  {
    "companyId": "company-051",
    "companyName": "GTK",
    "country": "Germany",
    "type": "MNO",
    "region": "Europe",
    "accountManagerEmployeeId": "emp-018"
  },
  {
    "companyId": "company-052",
    "companyName": "Hansa",
    "country": "UAE",
    "type": "Aggregator",
    "region": "Middle East",
    "accountManagerEmployeeId": "emp-019"
  },
  {
    "companyId": "company-053",
    "companyName": "Harisma",
    "country": "Singapore",
    "type": "CPaaS",
    "region": "Asia",
    "accountManagerEmployeeId": "emp-021"
  },
  {
    "companyId": "company-054",
    "companyName": "Hayo",
    "country": "South Africa",
    "type": "Enterprise",
    "region": "Africa",
    "accountManagerEmployeeId": "emp-022"
  },
  {
    "companyId": "company-055",
    "companyName": "Helo.ai",
    "country": "Brazil",
    "type": "Vendor",
    "region": "Americas",
    "accountManagerEmployeeId": "emp-023"
  },
  {
    "companyId": "company-056",
    "companyName": "Hot Mobile",
    "country": "Turkey",
    "type": "MNO",
    "region": "Europe",
    "accountManagerEmployeeId": "emp-027"
  },
  {
    "companyId": "company-057",
    "companyName": "Iconnect",
    "country": "USA",
    "type": "Aggregator",
    "region": "Americas",
    "accountManagerEmployeeId": "emp-029"
  },
  {
    "companyId": "company-058",
    "companyName": "Identidad",
    "country": "UK",
    "type": "CPaaS",
    "region": "Europe",
    "accountManagerEmployeeId": "emp-031"
  },
  {
    "companyId": "company-059",
    "companyName": "Infobip",
    "country": "Germany",
    "type": "Enterprise",
    "region": "Europe",
    "accountManagerEmployeeId": "emp-032"
  },
  {
    "companyId": "company-060",
    "companyName": "Innmobiles",
    "country": "UAE",
    "type": "Vendor",
    "region": "Middle East",
    "accountManagerEmployeeId": "emp-035"
  },
  {
    "companyId": "company-061",
    "companyName": "IPRoute",
    "country": "Singapore",
    "type": "MNO",
    "region": "Asia",
    "accountManagerEmployeeId": "emp-036"
  },
  {
    "companyId": "company-062",
    "companyName": "IT decision",
    "country": "South Africa",
    "type": "Aggregator",
    "region": "Africa",
    "accountManagerEmployeeId": "emp-037"
  },
  {
    "companyId": "company-063",
    "companyName": "Jo Telecom",
    "country": "Brazil",
    "type": "CPaaS",
    "region": "Americas",
    "accountManagerEmployeeId": "emp-039"
  },
  {
    "companyId": "company-064",
    "companyName": "Kaleyra",
    "country": "Turkey",
    "type": "Enterprise",
    "region": "Europe",
    "accountManagerEmployeeId": "emp-040"
  },
  {
    "companyId": "company-065",
    "companyName": "KDDI",
    "country": "USA",
    "type": "Vendor",
    "region": "Americas",
    "accountManagerEmployeeId": "emp-041"
  },
  {
    "companyId": "company-066",
    "companyName": "Kıte",
    "country": "UK",
    "type": "MNO",
    "region": "Europe",
    "accountManagerEmployeeId": "emp-042"
  },
  {
    "companyId": "company-067",
    "companyName": "Koltelecom",
    "country": "Germany",
    "type": "Aggregator",
    "region": "Europe",
    "accountManagerEmployeeId": "emp-044"
  },
  {
    "companyId": "company-068",
    "companyName": "Lanck",
    "country": "UAE",
    "type": "CPaaS",
    "region": "Middle East",
    "accountManagerEmployeeId": "emp-045"
  },
  {
    "companyId": "company-069",
    "companyName": "Lexico",
    "country": "Singapore",
    "type": "Enterprise",
    "region": "Asia",
    "accountManagerEmployeeId": "emp-048"
  },
  {
    "companyId": "company-070",
    "companyName": "lightup",
    "country": "South Africa",
    "type": "Vendor",
    "region": "Africa",
    "accountManagerEmployeeId": "emp-003"
  },
  {
    "companyId": "company-071",
    "companyName": "LinkMobility",
    "country": "Brazil",
    "type": "MNO",
    "region": "Americas",
    "accountManagerEmployeeId": "emp-005"
  },
  {
    "companyId": "company-072",
    "companyName": "LLeida (MVNO spain)",
    "country": "Turkey",
    "type": "Aggregator",
    "region": "Europe",
    "accountManagerEmployeeId": "emp-008"
  },
  {
    "companyId": "company-073",
    "companyName": "LMS",
    "country": "USA",
    "type": "CPaaS",
    "region": "Americas",
    "accountManagerEmployeeId": "emp-012"
  },
  {
    "companyId": "company-074",
    "companyName": "LoopMobility",
    "country": "UK",
    "type": "Enterprise",
    "region": "Europe",
    "accountManagerEmployeeId": "emp-018"
  },
  {
    "companyId": "company-075",
    "companyName": "M-Stat",
    "country": "Germany",
    "type": "Vendor",
    "region": "Europe",
    "accountManagerEmployeeId": "emp-019"
  },
  {
    "companyId": "company-076",
    "companyName": "MB",
    "country": "UAE",
    "type": "MNO",
    "region": "Middle East",
    "accountManagerEmployeeId": "emp-021"
  },
  {
    "companyId": "company-077",
    "companyName": "Mediafon",
    "country": "Singapore",
    "type": "Aggregator",
    "region": "Asia",
    "accountManagerEmployeeId": "emp-022"
  },
  {
    "companyId": "company-078",
    "companyName": "message world",
    "country": "South Africa",
    "type": "CPaaS",
    "region": "Africa",
    "accountManagerEmployeeId": "emp-023"
  },
  {
    "companyId": "company-079",
    "companyName": "Messente",
    "country": "Brazil",
    "type": "Enterprise",
    "region": "Americas",
    "accountManagerEmployeeId": "emp-027"
  },
  {
    "companyId": "company-080",
    "companyName": "Miatel",
    "country": "Turkey",
    "type": "Vendor",
    "region": "Europe",
    "accountManagerEmployeeId": "emp-029"
  },
  {
    "companyId": "company-081",
    "companyName": "Microtalk",
    "country": "USA",
    "type": "MNO",
    "region": "Americas",
    "accountManagerEmployeeId": "emp-031"
  },
  {
    "companyId": "company-082",
    "companyName": "Milagro",
    "country": "UK",
    "type": "Aggregator",
    "region": "Europe",
    "accountManagerEmployeeId": "emp-032"
  },
  {
    "companyId": "company-083",
    "companyName": "Mircoms",
    "country": "Germany",
    "type": "CPaaS",
    "region": "Europe",
    "accountManagerEmployeeId": "emp-035"
  },
  {
    "companyId": "company-084",
    "companyName": "Mitto",
    "country": "UAE",
    "type": "Enterprise",
    "region": "Middle East",
    "accountManagerEmployeeId": "emp-036"
  },
  {
    "companyId": "company-085",
    "companyName": "MMD",
    "country": "Singapore",
    "type": "Vendor",
    "region": "Asia",
    "accountManagerEmployeeId": "emp-037"
  },
  {
    "companyId": "company-086",
    "companyName": "Montnets",
    "country": "South Africa",
    "type": "MNO",
    "region": "Africa",
    "accountManagerEmployeeId": "emp-039"
  },
  {
    "companyId": "company-087",
    "companyName": "Monty",
    "country": "Brazil",
    "type": "Aggregator",
    "region": "Americas",
    "accountManagerEmployeeId": "emp-040"
  },
  {
    "companyId": "company-088",
    "companyName": "Mr Messaging",
    "country": "Turkey",
    "type": "CPaaS",
    "region": "Europe",
    "accountManagerEmployeeId": "emp-041"
  },
  {
    "companyId": "company-089",
    "companyName": "MSG bind",
    "country": "USA",
    "type": "Enterprise",
    "region": "Americas",
    "accountManagerEmployeeId": "emp-042"
  },
  {
    "companyId": "company-090",
    "companyName": "Munitel",
    "country": "UK",
    "type": "Vendor",
    "region": "Europe",
    "accountManagerEmployeeId": "emp-044"
  },
  {
    "companyId": "company-091",
    "companyName": "Musart",
    "country": "Germany",
    "type": "MNO",
    "region": "Europe",
    "accountManagerEmployeeId": "emp-045"
  },
  {
    "companyId": "company-092",
    "companyName": "NCS",
    "country": "UAE",
    "type": "Aggregator",
    "region": "Middle East",
    "accountManagerEmployeeId": "emp-048"
  },
  {
    "companyId": "company-093",
    "companyName": "Neso",
    "country": "Singapore",
    "type": "CPaaS",
    "region": "Asia",
    "accountManagerEmployeeId": "emp-003"
  },
  {
    "companyId": "company-094",
    "companyName": "Nettalk",
    "country": "South Africa",
    "type": "Enterprise",
    "region": "Africa",
    "accountManagerEmployeeId": "emp-005"
  },
  {
    "companyId": "company-095",
    "companyName": "Next Page",
    "country": "Brazil",
    "type": "Vendor",
    "region": "Americas",
    "accountManagerEmployeeId": "emp-008"
  },
  {
    "companyId": "company-096",
    "companyName": "NextMobile",
    "country": "Turkey",
    "type": "MNO",
    "region": "Europe",
    "accountManagerEmployeeId": "emp-012"
  },
  {
    "companyId": "company-097",
    "companyName": "NextVision",
    "country": "USA",
    "type": "Aggregator",
    "region": "Americas",
    "accountManagerEmployeeId": "emp-018"
  }
] as BaseCompanySeedRow[];

export const BASE_CONTACT_ROWS: BaseContactSeedRow[] = [
  {
    "contactId": "contact-001",
    "name": "Catherine",
    "companyId": "company-001",
    "title": "Head of Messaging",
    "email": "catherine@company-001.com"
  },
  {
    "contactId": "contact-002",
    "name": "Zaid",
    "companyId": "company-002",
    "title": "Carrier Relations Manager",
    "email": "zaid@company-002.com"
  },
  {
    "contactId": "contact-003",
    "name": "Ligin Thomas",
    "companyId": "company-003",
    "title": "SMS Product Manager",
    "email": "ligin.thomas@company-003.com"
  },
  {
    "contactId": "contact-004",
    "name": "Jovana",
    "companyId": "company-004",
    "title": "Network Director",
    "email": "jovana@company-004.com"
  },
  {
    "contactId": "contact-005",
    "name": "Hakan bayrak",
    "companyId": "company-005",
    "title": "Partnership Manager",
    "email": "hakan.bayrak@company-005.com"
  },
  {
    "contactId": "contact-006",
    "name": "Anna Antiukhova",
    "companyId": "company-006",
    "title": "Head of Messaging",
    "email": "anna.antiukhova@company-006.com"
  },
  {
    "contactId": "contact-007",
    "name": "Azis Kurniawan",
    "companyId": "company-007",
    "title": "Carrier Relations Manager",
    "email": "azis.kurniawan@company-007.com"
  },
  {
    "contactId": "contact-008",
    "name": "Luciano Di Stefano",
    "companyId": "company-008",
    "title": "SMS Product Manager",
    "email": "luciano.di.stefano@company-008.com"
  },
  {
    "contactId": "contact-009",
    "name": "Adnan Shaikh",
    "companyId": "company-009",
    "title": "Network Director",
    "email": "adnan.shaikh@company-009.com"
  },
  {
    "contactId": "contact-010",
    "name": "Tadej Prevolšek",
    "companyId": "company-010",
    "title": "Partnership Manager",
    "email": "tadej.prevolšek@company-010.com"
  },
  {
    "contactId": "contact-011",
    "name": "Mert Altıok",
    "companyId": "company-011",
    "title": "Head of Messaging",
    "email": "mert.altıok@company-011.com"
  },
  {
    "contactId": "contact-012",
    "name": "Jhonathan Amaya",
    "companyId": "company-012",
    "title": "Carrier Relations Manager",
    "email": "jhonathan.amaya@company-012.com"
  },
  {
    "contactId": "contact-013",
    "name": "Maya Mawla",
    "companyId": "company-013",
    "title": "SMS Product Manager",
    "email": "maya.mawla@company-013.com"
  },
  {
    "contactId": "contact-014",
    "name": "Chafic Maknieh",
    "companyId": "company-014",
    "title": "Network Director",
    "email": "chafic.maknieh@company-014.com"
  },
  {
    "contactId": "contact-015",
    "name": "Adrian",
    "companyId": "company-015",
    "title": "Partnership Manager",
    "email": "adrian@company-015.com"
  },
  {
    "contactId": "contact-016",
    "name": "Komal",
    "companyId": "company-016",
    "title": "Head of Messaging",
    "email": "komal@company-016.com"
  },
  {
    "contactId": "contact-017",
    "name": "Vanshika Aggarwal",
    "companyId": "company-017",
    "title": "Carrier Relations Manager",
    "email": "vanshika.aggarwal@company-017.com"
  },
  {
    "contactId": "contact-018",
    "name": "Icey Zhang",
    "companyId": "company-018",
    "title": "SMS Product Manager",
    "email": "icey.zhang@company-018.com"
  },
  {
    "contactId": "contact-019",
    "name": "Richard Zeidan -Shahi",
    "companyId": "company-019",
    "title": "Network Director",
    "email": "richard.zeidan.-shahi@company-019.com"
  },
  {
    "contactId": "contact-020",
    "name": "Pier - Pierpaolo",
    "companyId": "company-020",
    "title": "Partnership Manager",
    "email": "pier.-.pierpaolo@company-020.com"
  },
  {
    "contactId": "contact-021",
    "name": "Ruth Gachomo",
    "companyId": "company-021",
    "title": "Head of Messaging",
    "email": "ruth.gachomo@company-021.com"
  },
  {
    "contactId": "contact-022",
    "name": "Kanchan Massey",
    "companyId": "company-022",
    "title": "Carrier Relations Manager",
    "email": "kanchan.massey@company-022.com"
  },
  {
    "contactId": "contact-023",
    "name": "Goran siandc",
    "companyId": "company-023",
    "title": "SMS Product Manager",
    "email": "goran.siandc@company-023.com"
  },
  {
    "contactId": "contact-024",
    "name": "Ashish Dhar",
    "companyId": "company-024",
    "title": "Network Director",
    "email": "ashish.dhar@company-024.com"
  },
  {
    "contactId": "contact-025",
    "name": "Nadezda Panchenko",
    "companyId": "company-025",
    "title": "Partnership Manager",
    "email": "nadezda.panchenko@company-025.com"
  },
  {
    "contactId": "contact-026",
    "name": "Jan Scheinberger",
    "companyId": "company-026",
    "title": "Head of Messaging",
    "email": "jan.scheinberger@company-026.com"
  },
  {
    "contactId": "contact-027",
    "name": "Cecilia, Zita",
    "companyId": "company-027",
    "title": "Carrier Relations Manager",
    "email": "cecilia,.zita@company-027.com"
  },
  {
    "contactId": "contact-028",
    "name": "Priscilla",
    "companyId": "company-028",
    "title": "SMS Product Manager",
    "email": "priscilla@company-028.com"
  },
  {
    "contactId": "contact-029",
    "name": "Maryan Nasr",
    "companyId": "company-029",
    "title": "Network Director",
    "email": "maryan.nasr@company-029.com"
  },
  {
    "contactId": "contact-030",
    "name": "Plabon Alam",
    "companyId": "company-030",
    "title": "Partnership Manager",
    "email": "plabon.alam@company-030.com"
  },
  {
    "contactId": "contact-031",
    "name": "Stan Smolianyi",
    "companyId": "company-031",
    "title": "Head of Messaging",
    "email": "stan.smolianyi@company-031.com"
  },
  {
    "contactId": "contact-032",
    "name": "Jad Harb",
    "companyId": "company-032",
    "title": "Carrier Relations Manager",
    "email": "jad.harb@company-032.com"
  },
  {
    "contactId": "contact-033",
    "name": "Ruzvanna",
    "companyId": "company-033",
    "title": "SMS Product Manager",
    "email": "ruzvanna@company-033.com"
  },
  {
    "contactId": "contact-034",
    "name": "Shahid Nayyer",
    "companyId": "company-034",
    "title": "Network Director",
    "email": "shahid.nayyer@company-034.com"
  },
  {
    "contactId": "contact-035",
    "name": "Alina Arif",
    "companyId": "company-035",
    "title": "Partnership Manager",
    "email": "alina.arif@company-035.com"
  },
  {
    "contactId": "contact-036",
    "name": "Emanuele Astolfi",
    "companyId": "company-036",
    "title": "Head of Messaging",
    "email": "emanuele.astolfi@company-036.com"
  },
  {
    "contactId": "contact-037",
    "name": "Oksana",
    "companyId": "company-037",
    "title": "Carrier Relations Manager",
    "email": "oksana@company-037.com"
  },
  {
    "contactId": "contact-038",
    "name": "Irina Kitaeva",
    "companyId": "company-038",
    "title": "SMS Product Manager",
    "email": "irina.kitaeva@company-038.com"
  },
  {
    "contactId": "contact-039",
    "name": "Jennifer",
    "companyId": "company-039",
    "title": "Network Director",
    "email": "jennifer@company-039.com"
  },
  {
    "contactId": "contact-040",
    "name": "Emilija Jerkic live:ema.jerkic",
    "companyId": "company-040",
    "title": "Partnership Manager",
    "email": "emilija.jerkic.live:ema.jerkic@company-040.com"
  },
  {
    "contactId": "contact-041",
    "name": "Huzaifa Obaid",
    "companyId": "company-041",
    "title": "Head of Messaging",
    "email": "huzaifa.obaid@company-041.com"
  },
  {
    "contactId": "contact-042",
    "name": "Arevik",
    "companyId": "company-042",
    "title": "Carrier Relations Manager",
    "email": "arevik@company-042.com"
  },
  {
    "contactId": "contact-043",
    "name": "Nadia",
    "companyId": "company-043",
    "title": "SMS Product Manager",
    "email": "nadia@company-043.com"
  },
  {
    "contactId": "contact-044",
    "name": "Romina",
    "companyId": "company-044",
    "title": "Network Director",
    "email": "romina@company-044.com"
  },
  {
    "contactId": "contact-045",
    "name": "Chandra Biswal",
    "companyId": "company-045",
    "title": "Partnership Manager",
    "email": "chandra.biswal@company-045.com"
  },
  {
    "contactId": "contact-046",
    "name": "Saten",
    "companyId": "company-046",
    "title": "Head of Messaging",
    "email": "saten@company-046.com"
  },
  {
    "contactId": "contact-047",
    "name": "Carla Olivera",
    "companyId": "company-047",
    "title": "Carrier Relations Manager",
    "email": "carla.olivera@company-047.com"
  },
  {
    "contactId": "contact-048",
    "name": "AnnaNosenko",
    "companyId": "company-048",
    "title": "SMS Product Manager",
    "email": "annanosenko@company-048.com"
  },
  {
    "contactId": "contact-049",
    "name": "Veronica",
    "companyId": "company-049",
    "title": "Network Director",
    "email": "veronica@company-049.com"
  },
  {
    "contactId": "contact-050",
    "name": "Oleksii Yukhymenko",
    "companyId": "company-050",
    "title": "Partnership Manager",
    "email": "oleksii.yukhymenko@company-050.com"
  },
  {
    "contactId": "contact-051",
    "name": "Ghazal",
    "companyId": "company-051",
    "title": "Head of Messaging",
    "email": "ghazal@company-051.com"
  },
  {
    "contactId": "contact-052",
    "name": "Swapna",
    "companyId": "company-052",
    "title": "Carrier Relations Manager",
    "email": "swapna@company-052.com"
  },
  {
    "contactId": "contact-053",
    "name": "Lana",
    "companyId": "company-053",
    "title": "SMS Product Manager",
    "email": "lana@company-053.com"
  },
  {
    "contactId": "contact-054",
    "name": "Saad Sohail",
    "companyId": "company-054",
    "title": "Network Director",
    "email": "saad.sohail@company-054.com"
  },
  {
    "contactId": "contact-055",
    "name": "Santiago Galizia",
    "companyId": "company-055",
    "title": "Partnership Manager",
    "email": "santiago.galizia@company-055.com"
  },
  {
    "contactId": "contact-056",
    "name": "Enna karic",
    "companyId": "company-056",
    "title": "Head of Messaging",
    "email": "enna.karic@company-056.com"
  },
  {
    "contactId": "contact-057",
    "name": "Ramona Tabet",
    "companyId": "company-057",
    "title": "Carrier Relations Manager",
    "email": "ramona.tabet@company-057.com"
  },
  {
    "contactId": "contact-058",
    "name": "Rejah",
    "companyId": "company-058",
    "title": "SMS Product Manager",
    "email": "rejah@company-058.com"
  },
  {
    "contactId": "contact-059",
    "name": "Kateryana Dukai",
    "companyId": "company-059",
    "title": "Network Director",
    "email": "kateryana.dukai@company-059.com"
  },
  {
    "contactId": "contact-060",
    "name": "Hasan Yehya",
    "companyId": "company-060",
    "title": "Partnership Manager",
    "email": "hasan.yehya@company-060.com"
  },
  {
    "contactId": "contact-061",
    "name": "Rahul Pawar",
    "companyId": "company-061",
    "title": "Head of Messaging",
    "email": "rahul.pawar@company-061.com"
  },
  {
    "contactId": "contact-062",
    "name": "Omair Shah",
    "companyId": "company-062",
    "title": "Carrier Relations Manager",
    "email": "omair.shah@company-062.com"
  },
  {
    "contactId": "contact-063",
    "name": "Waqas",
    "companyId": "company-063",
    "title": "SMS Product Manager",
    "email": "waqas@company-063.com"
  },
  {
    "contactId": "contact-064",
    "name": "Sathisbabu",
    "companyId": "company-064",
    "title": "Network Director",
    "email": "sathisbabu@company-064.com"
  },
  {
    "contactId": "contact-065",
    "name": "Valeria Baranova",
    "companyId": "company-065",
    "title": "Partnership Manager",
    "email": "valeria.baranova@company-065.com"
  },
  {
    "contactId": "contact-066",
    "name": "Victoria Yeldyrova",
    "companyId": "company-066",
    "title": "Head of Messaging",
    "email": "victoria.yeldyrova@company-066.com"
  },
  {
    "contactId": "contact-067",
    "name": "Milos",
    "companyId": "company-067",
    "title": "Carrier Relations Manager",
    "email": "milos@company-067.com"
  },
  {
    "contactId": "contact-068",
    "name": "Need to check with Erol",
    "companyId": "company-068",
    "title": "SMS Product Manager",
    "email": "need.to.check.with.erol@company-068.com"
  },
  {
    "contactId": "contact-069",
    "name": "Marco Luengo",
    "companyId": "company-069",
    "title": "Network Director",
    "email": "marco.luengo@company-069.com"
  },
  {
    "contactId": "contact-070",
    "name": "Ravi Kumar",
    "companyId": "company-070",
    "title": "Partnership Manager",
    "email": "ravi.kumar@company-070.com"
  },
  {
    "contactId": "contact-071",
    "name": "Baljeet",
    "companyId": "company-071",
    "title": "Head of Messaging",
    "email": "baljeet@company-071.com"
  },
  {
    "contactId": "contact-072",
    "name": "Mary",
    "companyId": "company-072",
    "title": "Carrier Relations Manager",
    "email": "mary@company-072.com"
  },
  {
    "contactId": "contact-073",
    "name": "Manas",
    "companyId": "company-073",
    "title": "SMS Product Manager",
    "email": "manas@company-073.com"
  },
  {
    "contactId": "contact-074",
    "name": "Evghenia Tarcencova",
    "companyId": "company-074",
    "title": "Network Director",
    "email": "evghenia.tarcencova@company-074.com"
  },
  {
    "contactId": "contact-075",
    "name": "Peter Milic",
    "companyId": "company-075",
    "title": "Partnership Manager",
    "email": "peter.milic@company-075.com"
  },
  {
    "contactId": "contact-076",
    "name": "Annie Vardanyan",
    "companyId": "company-076",
    "title": "Head of Messaging",
    "email": "annie.vardanyan@company-076.com"
  },
  {
    "contactId": "contact-077",
    "name": "Olga Pervakova",
    "companyId": "company-077",
    "title": "Carrier Relations Manager",
    "email": "olga.pervakova@company-077.com"
  },
  {
    "contactId": "contact-078",
    "name": "Moazzam Ali",
    "companyId": "company-078",
    "title": "SMS Product Manager",
    "email": "moazzam.ali@company-078.com"
  },
  {
    "contactId": "contact-079",
    "name": "Mohammad Fakih",
    "companyId": "company-079",
    "title": "Network Director",
    "email": "mohammad.fakih@company-079.com"
  },
  {
    "contactId": "contact-080",
    "name": "Ghida",
    "companyId": "company-080",
    "title": "Partnership Manager",
    "email": "ghida@company-080.com"
  },
  {
    "contactId": "contact-081",
    "name": "Lara Mariantoni",
    "companyId": "company-081",
    "title": "Head of Messaging",
    "email": "lara.mariantoni@company-081.com"
  },
  {
    "contactId": "contact-082",
    "name": "Victoria Chobotko",
    "companyId": "company-082",
    "title": "Carrier Relations Manager",
    "email": "victoria.chobotko@company-082.com"
  },
  {
    "contactId": "contact-083",
    "name": "Ben Ling",
    "companyId": "company-083",
    "title": "SMS Product Manager",
    "email": "ben.ling@company-083.com"
  },
  {
    "contactId": "contact-084",
    "name": "Dana Mansour",
    "companyId": "company-084",
    "title": "Network Director",
    "email": "dana.mansour@company-084.com"
  },
  {
    "contactId": "contact-085",
    "name": "Chris Boyd",
    "companyId": "company-085",
    "title": "Partnership Manager",
    "email": "chris.boyd@company-085.com"
  },
  {
    "contactId": "contact-086",
    "name": "Yash",
    "companyId": "company-086",
    "title": "Head of Messaging",
    "email": "yash@company-086.com"
  },
  {
    "contactId": "contact-087",
    "name": "Hussein Haidar",
    "companyId": "company-087",
    "title": "Carrier Relations Manager",
    "email": "hussein.haidar@company-087.com"
  },
  {
    "contactId": "contact-088",
    "name": "Prakash",
    "companyId": "company-088",
    "title": "SMS Product Manager",
    "email": "prakash@company-088.com"
  },
  {
    "contactId": "contact-089",
    "name": "Mohamed Shehata",
    "companyId": "company-089",
    "title": "Network Director",
    "email": "mohamed.shehata@company-089.com"
  },
  {
    "contactId": "contact-090",
    "name": "Mayson Mahdi",
    "companyId": "company-090",
    "title": "Partnership Manager",
    "email": "mayson.mahdi@company-090.com"
  },
  {
    "contactId": "contact-091",
    "name": "Gautam",
    "companyId": "company-091",
    "title": "Head of Messaging",
    "email": "gautam@company-091.com"
  },
  {
    "contactId": "contact-092",
    "name": "Edyta Mosiej",
    "companyId": "company-092",
    "title": "Carrier Relations Manager",
    "email": "edyta.mosiej@company-092.com"
  },
  {
    "contactId": "contact-093",
    "name": "Nick Domentii",
    "companyId": "company-093",
    "title": "SMS Product Manager",
    "email": "nick.domentii@company-093.com"
  }
] as BaseContactSeedRow[];

export const BASE_EVENT_ROWS: BaseEventSeedRow[] = [
  {
    "eventId": "event-001",
    "eventName": "LONDON 2025 GCCM",
    "city": "London",
    "region": "Europe",
    "approxMonth": "Jul"
  },
  {
    "eventId": "event-002",
    "eventName": "Data Xchange lounge 2025",
    "city": "Global",
    "region": "Europe",
    "approxMonth": "Apr"
  },
  {
    "eventId": "event-003",
    "eventName": "London 2025 GCCM Ð Messaging Xchange",
    "city": "London",
    "region": "Europe",
    "approxMonth": "Nov"
  },
  {
    "eventId": "event-004",
    "eventName": "Capacity Middle East",
    "city": "Dubai",
    "region": "Middle East",
    "approxMonth": "Aug"
  },
  {
    "eventId": "event-005",
    "eventName": "Africa 2025 GCCM",
    "city": "Cape Town",
    "region": "Africa",
    "approxMonth": "May"
  },
  {
    "eventId": "event-006",
    "eventName": "IWTC 2025",
    "city": "Global",
    "region": "Europe",
    "approxMonth": "Jul"
  },
  {
    "eventId": "event-007",
    "eventName": "Mobilefest",
    "city": "Global",
    "region": "Europe",
    "approxMonth": "Oct"
  },
  {
    "eventId": "event-008",
    "eventName": "GSMA WAS#21",
    "city": "Global",
    "region": "Europe",
    "approxMonth": "Mar"
  },
  {
    "eventId": "event-009",
    "eventName": "ITW USA",
    "city": "Global",
    "region": "Europe",
    "approxMonth": "Jul"
  },
  {
    "eventId": "event-010",
    "eventName": "Messaging & SMS World 2025",
    "city": "Global",
    "region": "Europe",
    "approxMonth": "Nov"
  },
  {
    "eventId": "event-011",
    "eventName": "CC- Mobile & Messaging Summit-",
    "city": "Global",
    "region": "Europe",
    "approxMonth": "Nov"
  },
  {
    "eventId": "event-012",
    "eventName": "Data Xchange lounge 2025",
    "city": "Global",
    "region": "Europe",
    "approxMonth": "Aug"
  },
  {
    "eventId": "event-013",
    "eventName": "EUROPE 2025 GCCM -",
    "city": "Global",
    "region": "Europe",
    "approxMonth": "May"
  },
  {
    "eventId": "event-014",
    "eventName": "CC Global Awards 2025 (CCGA)",
    "city": "Global",
    "region": "Europe",
    "approxMonth": "Apr"
  },
  {
    "eventId": "event-015",
    "eventName": "C-Level Lunch 2025",
    "city": "Global",
    "region": "Europe",
    "approxMonth": "Aug"
  },
  {
    "eventId": "event-016",
    "eventName": "Capacity Eurasia",
    "city": "Singapore",
    "region": "Asia",
    "approxMonth": "Aug"
  },
  {
    "eventId": "event-017",
    "eventName": "CIS 2025 GCCM",
    "city": "Global",
    "region": "Europe",
    "approxMonth": "Mar"
  },
  {
    "eventId": "event-018",
    "eventName": "ITW Kenya",
    "city": "Global",
    "region": "Europe",
    "approxMonth": "Jun"
  },
  {
    "eventId": "event-019",
    "eventName": "WWC Madrid",
    "city": "Global",
    "region": "Europe",
    "approxMonth": "May"
  },
  {
    "eventId": "event-020",
    "eventName": "Capacity Europe",
    "city": "Global",
    "region": "Europe",
    "approxMonth": "Feb"
  },
  {
    "eventId": "event-021",
    "eventName": "MWC Kigali",
    "city": "Global",
    "region": "Europe",
    "approxMonth": "Aug"
  },
  {
    "eventId": "event-022",
    "eventName": "GSMA WAS#22 Rome",
    "city": "Global",
    "region": "Europe",
    "approxMonth": "Dec"
  },
  {
    "eventId": "event-023",
    "eventName": "Middle East 2025 GCCM",
    "city": "Dubai",
    "region": "Middle East",
    "approxMonth": "Jun"
  },
  {
    "eventId": "event-024",
    "eventName": "C-Level Summit 2025 The Muscat",
    "city": "Global",
    "region": "Europe",
    "approxMonth": "Feb"
  },
  {
    "eventId": "event-025",
    "eventName": "CC- ME Submarine Summit 2025 Ð Muscat",
    "city": "Global",
    "region": "Europe",
    "approxMonth": "Dec"
  },
  {
    "eventId": "event-026",
    "eventName": "Africa Tech Festival (AfricaCom)",
    "city": "Cape Town",
    "region": "Africa",
    "approxMonth": "May"
  },
  {
    "eventId": "event-027",
    "eventName": "ITW Asia",
    "city": "Singapore",
    "region": "Asia",
    "approxMonth": "Jan"
  }
] as BaseEventSeedRow[];

export const BASE_MEETING_TARGET_ROWS: BaseMeetingTargetSeedRow[] = [
  {
    "employeeId": "emp-001",
    "companyId": "company-053",
    "eventId": "event-003",
    "priority": "Low"
  },
  {
    "employeeId": "emp-001",
    "companyId": "company-071",
    "eventId": "event-003",
    "priority": "High"
  },
  {
    "employeeId": "emp-001",
    "companyId": "company-059",
    "eventId": "event-003",
    "priority": "High"
  },
  {
    "employeeId": "emp-002",
    "companyId": "company-041",
    "eventId": "event-018",
    "priority": "Low"
  },
  {
    "employeeId": "emp-002",
    "companyId": "company-070",
    "eventId": "event-018",
    "priority": "Low"
  },
  {
    "employeeId": "emp-002",
    "companyId": "company-001",
    "eventId": "event-018",
    "priority": "Low"
  },
  {
    "employeeId": "emp-003",
    "companyId": "company-042",
    "eventId": "event-026",
    "priority": "High"
  },
  {
    "employeeId": "emp-003",
    "companyId": "company-002",
    "eventId": "event-026",
    "priority": "High"
  },
  {
    "employeeId": "emp-003",
    "companyId": "company-053",
    "eventId": "event-026",
    "priority": "Low"
  },
  {
    "employeeId": "emp-004",
    "companyId": "company-054",
    "eventId": "event-019",
    "priority": "Low"
  },
  {
    "employeeId": "emp-004",
    "companyId": "company-068",
    "eventId": "event-019",
    "priority": "Low"
  },
  {
    "employeeId": "emp-004",
    "companyId": "company-028",
    "eventId": "event-019",
    "priority": "Low"
  },
  {
    "employeeId": "emp-005",
    "companyId": "company-095",
    "eventId": "event-025",
    "priority": "Low"
  },
  {
    "employeeId": "emp-005",
    "companyId": "company-053",
    "eventId": "event-025",
    "priority": "Low"
  },
  {
    "employeeId": "emp-005",
    "companyId": "company-096",
    "eventId": "event-025",
    "priority": "High"
  },
  {
    "employeeId": "emp-006",
    "companyId": "company-022",
    "eventId": "event-024",
    "priority": "Low"
  },
  {
    "employeeId": "emp-006",
    "companyId": "company-084",
    "eventId": "event-024",
    "priority": "Low"
  },
  {
    "employeeId": "emp-006",
    "companyId": "company-019",
    "eventId": "event-024",
    "priority": "High"
  },
  {
    "employeeId": "emp-007",
    "companyId": "company-087",
    "eventId": "event-007",
    "priority": "High"
  },
  {
    "employeeId": "emp-007",
    "companyId": "company-032",
    "eventId": "event-007",
    "priority": "High"
  },
  {
    "employeeId": "emp-007",
    "companyId": "company-081",
    "eventId": "event-007",
    "priority": "High"
  },
  {
    "employeeId": "emp-008",
    "companyId": "company-008",
    "eventId": "event-003",
    "priority": "High"
  },
  {
    "employeeId": "emp-008",
    "companyId": "company-076",
    "eventId": "event-003",
    "priority": "High"
  },
  {
    "employeeId": "emp-008",
    "companyId": "company-042",
    "eventId": "event-003",
    "priority": "High"
  },
  {
    "employeeId": "emp-009",
    "companyId": "company-086",
    "eventId": "event-023",
    "priority": "High"
  },
  {
    "employeeId": "emp-009",
    "companyId": "company-096",
    "eventId": "event-023",
    "priority": "High"
  },
  {
    "employeeId": "emp-009",
    "companyId": "company-085",
    "eventId": "event-023",
    "priority": "Low"
  },
  {
    "employeeId": "emp-010",
    "companyId": "company-002",
    "eventId": "event-006",
    "priority": "High"
  },
  {
    "employeeId": "emp-010",
    "companyId": "company-049",
    "eventId": "event-006",
    "priority": "Low"
  },
  {
    "employeeId": "emp-010",
    "companyId": "company-048",
    "eventId": "event-006",
    "priority": "High"
  },
  {
    "employeeId": "emp-011",
    "companyId": "company-075",
    "eventId": "event-008",
    "priority": "High"
  },
  {
    "employeeId": "emp-011",
    "companyId": "company-002",
    "eventId": "event-008",
    "priority": "High"
  },
  {
    "employeeId": "emp-011",
    "companyId": "company-062",
    "eventId": "event-008",
    "priority": "Low"
  },
  {
    "employeeId": "emp-012",
    "companyId": "company-017",
    "eventId": "event-011",
    "priority": "High"
  },
  {
    "employeeId": "emp-012",
    "companyId": "company-002",
    "eventId": "event-011",
    "priority": "High"
  },
  {
    "employeeId": "emp-012",
    "companyId": "company-046",
    "eventId": "event-011",
    "priority": "High"
  },
  {
    "employeeId": "emp-013",
    "companyId": "company-016",
    "eventId": "event-008",
    "priority": "High"
  },
  {
    "employeeId": "emp-013",
    "companyId": "company-072",
    "eventId": "event-008",
    "priority": "High"
  },
  {
    "employeeId": "emp-013",
    "companyId": "company-026",
    "eventId": "event-008",
    "priority": "High"
  },
  {
    "employeeId": "emp-014",
    "companyId": "company-075",
    "eventId": "event-009",
    "priority": "High"
  },
  {
    "employeeId": "emp-014",
    "companyId": "company-024",
    "eventId": "event-009",
    "priority": "High"
  },
  {
    "employeeId": "emp-014",
    "companyId": "company-080",
    "eventId": "event-009",
    "priority": "High"
  },
  {
    "employeeId": "emp-015",
    "companyId": "company-050",
    "eventId": "event-004",
    "priority": "High"
  },
  {
    "employeeId": "emp-015",
    "companyId": "company-075",
    "eventId": "event-004",
    "priority": "High"
  },
  {
    "employeeId": "emp-015",
    "companyId": "company-084",
    "eventId": "event-004",
    "priority": "Low"
  },
  {
    "employeeId": "emp-016",
    "companyId": "company-082",
    "eventId": "event-020",
    "priority": "High"
  },
  {
    "employeeId": "emp-016",
    "companyId": "company-017",
    "eventId": "event-020",
    "priority": "High"
  },
  {
    "employeeId": "emp-016",
    "companyId": "company-006",
    "eventId": "event-020",
    "priority": "High"
  },
  {
    "employeeId": "emp-017",
    "companyId": "company-022",
    "eventId": "event-007",
    "priority": "Low"
  },
  {
    "employeeId": "emp-017",
    "companyId": "company-051",
    "eventId": "event-007",
    "priority": "High"
  },
  {
    "employeeId": "emp-017",
    "companyId": "company-054",
    "eventId": "event-007",
    "priority": "Low"
  },
  {
    "employeeId": "emp-018",
    "companyId": "company-028",
    "eventId": "event-026",
    "priority": "Low"
  },
  {
    "employeeId": "emp-018",
    "companyId": "company-051",
    "eventId": "event-026",
    "priority": "High"
  },
  {
    "employeeId": "emp-018",
    "companyId": "company-019",
    "eventId": "event-026",
    "priority": "High"
  },
  {
    "employeeId": "emp-018",
    "companyId": "company-008",
    "eventId": "event-026",
    "priority": "High"
  },
  {
    "employeeId": "emp-018",
    "companyId": "company-076",
    "eventId": "event-026",
    "priority": "Low"
  },
  {
    "employeeId": "emp-018",
    "companyId": "company-064",
    "eventId": "event-026",
    "priority": "High"
  },
  {
    "employeeId": "emp-018",
    "companyId": "company-062",
    "eventId": "event-026",
    "priority": "Low"
  },
  {
    "employeeId": "emp-018",
    "companyId": "company-056",
    "eventId": "event-026",
    "priority": "High"
  },
  {
    "employeeId": "emp-018",
    "companyId": "company-003",
    "eventId": "event-026",
    "priority": "High"
  },
  {
    "employeeId": "emp-018",
    "companyId": "company-035",
    "eventId": "event-026",
    "priority": "High"
  },
  {
    "employeeId": "emp-019",
    "companyId": "company-064",
    "eventId": "event-023",
    "priority": "High"
  },
  {
    "employeeId": "emp-019",
    "companyId": "company-050",
    "eventId": "event-023",
    "priority": "High"
  },
  {
    "employeeId": "emp-019",
    "companyId": "company-085",
    "eventId": "event-023",
    "priority": "Low"
  },
  {
    "employeeId": "emp-019",
    "companyId": "company-018",
    "eventId": "event-023",
    "priority": "High"
  },
  {
    "employeeId": "emp-019",
    "companyId": "company-083",
    "eventId": "event-023",
    "priority": "High"
  },
  {
    "employeeId": "emp-019",
    "companyId": "company-073",
    "eventId": "event-023",
    "priority": "Low"
  },
  {
    "employeeId": "emp-019",
    "companyId": "company-065",
    "eventId": "event-023",
    "priority": "Low"
  },
  {
    "employeeId": "emp-019",
    "companyId": "company-096",
    "eventId": "event-023",
    "priority": "High"
  },
  {
    "employeeId": "emp-019",
    "companyId": "company-026",
    "eventId": "event-023",
    "priority": "High"
  },
  {
    "employeeId": "emp-019",
    "companyId": "company-003",
    "eventId": "event-023",
    "priority": "High"
  },
  {
    "employeeId": "emp-020",
    "companyId": "company-010",
    "eventId": "event-018",
    "priority": "High"
  },
  {
    "employeeId": "emp-020",
    "companyId": "company-074",
    "eventId": "event-018",
    "priority": "High"
  },
  {
    "employeeId": "emp-020",
    "companyId": "company-024",
    "eventId": "event-018",
    "priority": "High"
  },
  {
    "employeeId": "emp-021",
    "companyId": "company-057",
    "eventId": "event-014",
    "priority": "High"
  },
  {
    "employeeId": "emp-021",
    "companyId": "company-088",
    "eventId": "event-014",
    "priority": "High"
  },
  {
    "employeeId": "emp-021",
    "companyId": "company-087",
    "eventId": "event-014",
    "priority": "High"
  },
  {
    "employeeId": "emp-022",
    "companyId": "company-005",
    "eventId": "event-002",
    "priority": "Low"
  },
  {
    "employeeId": "emp-022",
    "companyId": "company-027",
    "eventId": "event-002",
    "priority": "High"
  },
  {
    "employeeId": "emp-022",
    "companyId": "company-071",
    "eventId": "event-002",
    "priority": "High"
  },
  {
    "employeeId": "emp-023",
    "companyId": "company-020",
    "eventId": "event-024",
    "priority": "Low"
  },
  {
    "employeeId": "emp-023",
    "companyId": "company-048",
    "eventId": "event-024",
    "priority": "High"
  },
  {
    "employeeId": "emp-023",
    "companyId": "company-042",
    "eventId": "event-024",
    "priority": "High"
  },
  {
    "employeeId": "emp-023",
    "companyId": "company-083",
    "eventId": "event-024",
    "priority": "High"
  },
  {
    "employeeId": "emp-023",
    "companyId": "company-017",
    "eventId": "event-024",
    "priority": "Low"
  },
  {
    "employeeId": "emp-023",
    "companyId": "company-034",
    "eventId": "event-024",
    "priority": "High"
  },
  {
    "employeeId": "emp-023",
    "companyId": "company-026",
    "eventId": "event-024",
    "priority": "High"
  },
  {
    "employeeId": "emp-023",
    "companyId": "company-067",
    "eventId": "event-024",
    "priority": "High"
  },
  {
    "employeeId": "emp-023",
    "companyId": "company-022",
    "eventId": "event-024",
    "priority": "Low"
  },
  {
    "employeeId": "emp-023",
    "companyId": "company-080",
    "eventId": "event-024",
    "priority": "High"
  },
  {
    "employeeId": "emp-024",
    "companyId": "company-050",
    "eventId": "event-019",
    "priority": "High"
  },
  {
    "employeeId": "emp-024",
    "companyId": "company-091",
    "eventId": "event-019",
    "priority": "High"
  },
  {
    "employeeId": "emp-024",
    "companyId": "company-074",
    "eventId": "event-019",
    "priority": "High"
  },
  {
    "employeeId": "emp-025",
    "companyId": "company-093",
    "eventId": "event-007",
    "priority": "Low"
  },
  {
    "employeeId": "emp-025",
    "companyId": "company-067",
    "eventId": "event-007",
    "priority": "High"
  },
  {
    "employeeId": "emp-025",
    "companyId": "company-097",
    "eventId": "event-007",
    "priority": "Low"
  },
  {
    "employeeId": "emp-026",
    "companyId": "company-084",
    "eventId": "event-003",
    "priority": "Low"
  },
  {
    "employeeId": "emp-026",
    "companyId": "company-057",
    "eventId": "event-003",
    "priority": "Low"
  },
  {
    "employeeId": "emp-026",
    "companyId": "company-027",
    "eventId": "event-003",
    "priority": "High"
  },
  {
    "employeeId": "emp-027",
    "companyId": "company-031",
    "eventId": "event-012",
    "priority": "Low"
  },
  {
    "employeeId": "emp-027",
    "companyId": "company-050",
    "eventId": "event-012",
    "priority": "High"
  },
  {
    "employeeId": "emp-027",
    "companyId": "company-074",
    "eventId": "event-012",
    "priority": "High"
  },
  {
    "employeeId": "emp-027",
    "companyId": "company-076",
    "eventId": "event-012",
    "priority": "Low"
  },
  {
    "employeeId": "emp-027",
    "companyId": "company-084",
    "eventId": "event-012",
    "priority": "Low"
  },
  {
    "employeeId": "emp-027",
    "companyId": "company-018",
    "eventId": "event-012",
    "priority": "High"
  },
  {
    "employeeId": "emp-027",
    "companyId": "company-026",
    "eventId": "event-012",
    "priority": "High"
  },
  {
    "employeeId": "emp-027",
    "companyId": "company-048",
    "eventId": "event-012",
    "priority": "High"
  },
  {
    "employeeId": "emp-027",
    "companyId": "company-072",
    "eventId": "event-012",
    "priority": "High"
  },
  {
    "employeeId": "emp-027",
    "companyId": "company-019",
    "eventId": "event-012",
    "priority": "High"
  },
  {
    "employeeId": "emp-028",
    "companyId": "company-042",
    "eventId": "event-024",
    "priority": "High"
  },
  {
    "employeeId": "emp-028",
    "companyId": "company-080",
    "eventId": "event-024",
    "priority": "High"
  },
  {
    "employeeId": "emp-028",
    "companyId": "company-072",
    "eventId": "event-024",
    "priority": "High"
  },
  {
    "employeeId": "emp-029",
    "companyId": "company-072",
    "eventId": "event-011",
    "priority": "High"
  },
  {
    "employeeId": "emp-029",
    "companyId": "company-055",
    "eventId": "event-011",
    "priority": "Low"
  },
  {
    "employeeId": "emp-029",
    "companyId": "company-012",
    "eventId": "event-011",
    "priority": "Low"
  },
  {
    "employeeId": "emp-029",
    "companyId": "company-040",
    "eventId": "event-011",
    "priority": "High"
  },
  {
    "employeeId": "emp-029",
    "companyId": "company-075",
    "eventId": "event-011",
    "priority": "High"
  },
  {
    "employeeId": "emp-029",
    "companyId": "company-050",
    "eventId": "event-011",
    "priority": "High"
  },
  {
    "employeeId": "emp-029",
    "companyId": "company-018",
    "eventId": "event-011",
    "priority": "High"
  },
  {
    "employeeId": "emp-029",
    "companyId": "company-083",
    "eventId": "event-011",
    "priority": "High"
  },
  {
    "employeeId": "emp-029",
    "companyId": "company-092",
    "eventId": "event-011",
    "priority": "Low"
  },
  {
    "employeeId": "emp-029",
    "companyId": "company-096",
    "eventId": "event-011",
    "priority": "High"
  },
  {
    "employeeId": "emp-030",
    "companyId": "company-083",
    "eventId": "event-015",
    "priority": "High"
  },
  {
    "employeeId": "emp-030",
    "companyId": "company-027",
    "eventId": "event-015",
    "priority": "High"
  },
  {
    "employeeId": "emp-030",
    "companyId": "company-008",
    "eventId": "event-015",
    "priority": "High"
  },
  {
    "employeeId": "emp-031",
    "companyId": "company-063",
    "eventId": "event-026",
    "priority": "Low"
  },
  {
    "employeeId": "emp-031",
    "companyId": "company-037",
    "eventId": "event-026",
    "priority": "High"
  },
  {
    "employeeId": "emp-031",
    "companyId": "company-066",
    "eventId": "event-026",
    "priority": "High"
  },
  {
    "employeeId": "emp-032",
    "companyId": "company-027",
    "eventId": "event-010",
    "priority": "High"
  },
  {
    "employeeId": "emp-032",
    "companyId": "company-092",
    "eventId": "event-010",
    "priority": "Low"
  },
  {
    "employeeId": "emp-032",
    "companyId": "company-075",
    "eventId": "event-010",
    "priority": "High"
  },
  {
    "employeeId": "emp-032",
    "companyId": "company-096",
    "eventId": "event-010",
    "priority": "High"
  },
  {
    "employeeId": "emp-032",
    "companyId": "company-020",
    "eventId": "event-010",
    "priority": "Low"
  },
  {
    "employeeId": "emp-032",
    "companyId": "company-014",
    "eventId": "event-010",
    "priority": "Low"
  },
  {
    "employeeId": "emp-032",
    "companyId": "company-088",
    "eventId": "event-010",
    "priority": "High"
  },
  {
    "employeeId": "emp-032",
    "companyId": "company-008",
    "eventId": "event-010",
    "priority": "High"
  },
  {
    "employeeId": "emp-032",
    "companyId": "company-052",
    "eventId": "event-010",
    "priority": "Low"
  },
  {
    "employeeId": "emp-032",
    "companyId": "company-010",
    "eventId": "event-010",
    "priority": "High"
  },
  {
    "employeeId": "emp-033",
    "companyId": "company-083",
    "eventId": "event-019",
    "priority": "High"
  },
  {
    "employeeId": "emp-033",
    "companyId": "company-035",
    "eventId": "event-019",
    "priority": "High"
  },
  {
    "employeeId": "emp-033",
    "companyId": "company-054",
    "eventId": "event-019",
    "priority": "Low"
  },
  {
    "employeeId": "emp-034",
    "companyId": "company-024",
    "eventId": "event-022",
    "priority": "High"
  },
  {
    "employeeId": "emp-034",
    "companyId": "company-043",
    "eventId": "event-022",
    "priority": "High"
  },
  {
    "employeeId": "emp-034",
    "companyId": "company-040",
    "eventId": "event-022",
    "priority": "High"
  },
  {
    "employeeId": "emp-035",
    "companyId": "company-003",
    "eventId": "event-019",
    "priority": "High"
  },
  {
    "employeeId": "emp-035",
    "companyId": "company-075",
    "eventId": "event-019",
    "priority": "High"
  },
  {
    "employeeId": "emp-035",
    "companyId": "company-010",
    "eventId": "event-019",
    "priority": "High"
  },
  {
    "employeeId": "emp-035",
    "companyId": "company-061",
    "eventId": "event-019",
    "priority": "Low"
  },
  {
    "employeeId": "emp-035",
    "companyId": "company-002",
    "eventId": "event-019",
    "priority": "High"
  },
  {
    "employeeId": "emp-035",
    "companyId": "company-091",
    "eventId": "event-019",
    "priority": "High"
  },
  {
    "employeeId": "emp-035",
    "companyId": "company-042",
    "eventId": "event-019",
    "priority": "High"
  },
  {
    "employeeId": "emp-035",
    "companyId": "company-025",
    "eventId": "event-019",
    "priority": "Low"
  },
  {
    "employeeId": "emp-035",
    "companyId": "company-019",
    "eventId": "event-019",
    "priority": "High"
  },
  {
    "employeeId": "emp-035",
    "companyId": "company-041",
    "eventId": "event-019",
    "priority": "Low"
  },
  {
    "employeeId": "emp-036",
    "companyId": "company-044",
    "eventId": "event-026",
    "priority": "Low"
  },
  {
    "employeeId": "emp-036",
    "companyId": "company-031",
    "eventId": "event-026",
    "priority": "Low"
  },
  {
    "employeeId": "emp-036",
    "companyId": "company-024",
    "eventId": "event-026",
    "priority": "High"
  },
  {
    "employeeId": "emp-036",
    "companyId": "company-027",
    "eventId": "event-026",
    "priority": "High"
  },
  {
    "employeeId": "emp-036",
    "companyId": "company-080",
    "eventId": "event-026",
    "priority": "High"
  },
  {
    "employeeId": "emp-036",
    "companyId": "company-011",
    "eventId": "event-026",
    "priority": "High"
  },
  {
    "employeeId": "emp-036",
    "companyId": "company-060",
    "eventId": "event-026",
    "priority": "Low"
  },
  {
    "employeeId": "emp-036",
    "companyId": "company-066",
    "eventId": "event-026",
    "priority": "High"
  },
  {
    "employeeId": "emp-036",
    "companyId": "company-078",
    "eventId": "event-026",
    "priority": "Low"
  },
  {
    "employeeId": "emp-036",
    "companyId": "company-003",
    "eventId": "event-026",
    "priority": "High"
  },
  {
    "employeeId": "emp-037",
    "companyId": "company-072",
    "eventId": "event-018",
    "priority": "High"
  },
  {
    "employeeId": "emp-037",
    "companyId": "company-058",
    "eventId": "event-018",
    "priority": "High"
  },
  {
    "employeeId": "emp-037",
    "companyId": "company-091",
    "eventId": "event-018",
    "priority": "High"
  },
  {
    "employeeId": "emp-037",
    "companyId": "company-015",
    "eventId": "event-018",
    "priority": "Low"
  },
  {
    "employeeId": "emp-037",
    "companyId": "company-079",
    "eventId": "event-018",
    "priority": "Low"
  },
  {
    "employeeId": "emp-037",
    "companyId": "company-035",
    "eventId": "event-018",
    "priority": "High"
  },
  {
    "employeeId": "emp-037",
    "companyId": "company-018",
    "eventId": "event-018",
    "priority": "High"
  },
  {
    "employeeId": "emp-037",
    "companyId": "company-026",
    "eventId": "event-018",
    "priority": "High"
  },
  {
    "employeeId": "emp-037",
    "companyId": "company-061",
    "eventId": "event-018",
    "priority": "Low"
  },
  {
    "employeeId": "emp-037",
    "companyId": "company-003",
    "eventId": "event-018",
    "priority": "High"
  },
  {
    "employeeId": "emp-038",
    "companyId": "company-091",
    "eventId": "event-008",
    "priority": "High"
  },
  {
    "employeeId": "emp-038",
    "companyId": "company-045",
    "eventId": "event-008",
    "priority": "Low"
  },
  {
    "employeeId": "emp-038",
    "companyId": "company-019",
    "eventId": "event-008",
    "priority": "High"
  },
  {
    "employeeId": "emp-039",
    "companyId": "company-038",
    "eventId": "event-010",
    "priority": "Low"
  },
  {
    "employeeId": "emp-039",
    "companyId": "company-083",
    "eventId": "event-010",
    "priority": "High"
  },
  {
    "employeeId": "emp-039",
    "companyId": "company-091",
    "eventId": "event-010",
    "priority": "High"
  },
  {
    "employeeId": "emp-039",
    "companyId": "company-067",
    "eventId": "event-010",
    "priority": "High"
  },
  {
    "employeeId": "emp-039",
    "companyId": "company-062",
    "eventId": "event-010",
    "priority": "Low"
  },
  {
    "employeeId": "emp-039",
    "companyId": "company-059",
    "eventId": "event-010",
    "priority": "High"
  },
  {
    "employeeId": "emp-039",
    "companyId": "company-019",
    "eventId": "event-010",
    "priority": "High"
  },
  {
    "employeeId": "emp-039",
    "companyId": "company-026",
    "eventId": "event-010",
    "priority": "High"
  },
  {
    "employeeId": "emp-039",
    "companyId": "company-008",
    "eventId": "event-010",
    "priority": "High"
  },
  {
    "employeeId": "emp-039",
    "companyId": "company-029",
    "eventId": "event-010",
    "priority": "Low"
  },
  {
    "employeeId": "emp-040",
    "companyId": "company-053",
    "eventId": "event-018",
    "priority": "Low"
  },
  {
    "employeeId": "emp-040",
    "companyId": "company-077",
    "eventId": "event-018",
    "priority": "High"
  },
  {
    "employeeId": "emp-040",
    "companyId": "company-081",
    "eventId": "event-018",
    "priority": "High"
  },
  {
    "employeeId": "emp-041",
    "companyId": "company-040",
    "eventId": "event-003",
    "priority": "High"
  },
  {
    "employeeId": "emp-041",
    "companyId": "company-006",
    "eventId": "event-003",
    "priority": "Low"
  },
  {
    "employeeId": "emp-041",
    "companyId": "company-076",
    "eventId": "event-003",
    "priority": "Low"
  },
  {
    "employeeId": "emp-041",
    "companyId": "company-027",
    "eventId": "event-003",
    "priority": "High"
  },
  {
    "employeeId": "emp-041",
    "companyId": "company-043",
    "eventId": "event-003",
    "priority": "High"
  },
  {
    "employeeId": "emp-041",
    "companyId": "company-030",
    "eventId": "event-003",
    "priority": "Low"
  },
  {
    "employeeId": "emp-041",
    "companyId": "company-051",
    "eventId": "event-003",
    "priority": "High"
  },
  {
    "employeeId": "emp-041",
    "companyId": "company-060",
    "eventId": "event-003",
    "priority": "Low"
  },
  {
    "employeeId": "emp-041",
    "companyId": "company-075",
    "eventId": "event-003",
    "priority": "High"
  },
  {
    "employeeId": "emp-041",
    "companyId": "company-066",
    "eventId": "event-003",
    "priority": "High"
  },
  {
    "employeeId": "emp-042",
    "companyId": "company-025",
    "eventId": "event-008",
    "priority": "Low"
  },
  {
    "employeeId": "emp-042",
    "companyId": "company-004",
    "eventId": "event-008",
    "priority": "Low"
  },
  {
    "employeeId": "emp-042",
    "companyId": "company-066",
    "eventId": "event-008",
    "priority": "High"
  },
  {
    "employeeId": "emp-043",
    "companyId": "company-036",
    "eventId": "event-009",
    "priority": "Low"
  },
  {
    "employeeId": "emp-043",
    "companyId": "company-091",
    "eventId": "event-009",
    "priority": "High"
  },
  {
    "employeeId": "emp-043",
    "companyId": "company-072",
    "eventId": "event-009",
    "priority": "High"
  },
  {
    "employeeId": "emp-044",
    "companyId": "company-011",
    "eventId": "event-009",
    "priority": "High"
  },
  {
    "employeeId": "emp-044",
    "companyId": "company-059",
    "eventId": "event-009",
    "priority": "High"
  },
  {
    "employeeId": "emp-044",
    "companyId": "company-013",
    "eventId": "event-009",
    "priority": "Low"
  },
  {
    "employeeId": "emp-044",
    "companyId": "company-024",
    "eventId": "event-009",
    "priority": "High"
  },
  {
    "employeeId": "emp-044",
    "companyId": "company-032",
    "eventId": "event-009",
    "priority": "High"
  },
  {
    "employeeId": "emp-044",
    "companyId": "company-083",
    "eventId": "event-009",
    "priority": "High"
  },
  {
    "employeeId": "emp-044",
    "companyId": "company-065",
    "eventId": "event-009",
    "priority": "Low"
  },
  {
    "employeeId": "emp-044",
    "companyId": "company-052",
    "eventId": "event-009",
    "priority": "Low"
  },
  {
    "employeeId": "emp-044",
    "companyId": "company-003",
    "eventId": "event-009",
    "priority": "High"
  },
  {
    "employeeId": "emp-044",
    "companyId": "company-072",
    "eventId": "event-009",
    "priority": "High"
  },
  {
    "employeeId": "emp-045",
    "companyId": "company-082",
    "eventId": "event-009",
    "priority": "High"
  },
  {
    "employeeId": "emp-045",
    "companyId": "company-010",
    "eventId": "event-009",
    "priority": "High"
  },
  {
    "employeeId": "emp-045",
    "companyId": "company-072",
    "eventId": "event-009",
    "priority": "High"
  },
  {
    "employeeId": "emp-045",
    "companyId": "company-035",
    "eventId": "event-009",
    "priority": "High"
  },
  {
    "employeeId": "emp-045",
    "companyId": "company-059",
    "eventId": "event-009",
    "priority": "High"
  },
  {
    "employeeId": "emp-045",
    "companyId": "company-039",
    "eventId": "event-009",
    "priority": "Low"
  },
  {
    "employeeId": "emp-045",
    "companyId": "company-040",
    "eventId": "event-009",
    "priority": "High"
  },
  {
    "employeeId": "emp-045",
    "companyId": "company-050",
    "eventId": "event-009",
    "priority": "High"
  },
  {
    "employeeId": "emp-045",
    "companyId": "company-069",
    "eventId": "event-009",
    "priority": "Low"
  },
  {
    "employeeId": "emp-045",
    "companyId": "company-094",
    "eventId": "event-009",
    "priority": "Low"
  },
  {
    "employeeId": "emp-046",
    "companyId": "company-096",
    "eventId": "event-011",
    "priority": "High"
  },
  {
    "employeeId": "emp-046",
    "companyId": "company-053",
    "eventId": "event-011",
    "priority": "Low"
  },
  {
    "employeeId": "emp-046",
    "companyId": "company-027",
    "eventId": "event-011",
    "priority": "High"
  },
  {
    "employeeId": "emp-047",
    "companyId": "company-075",
    "eventId": "event-004",
    "priority": "High"
  },
  {
    "employeeId": "emp-047",
    "companyId": "company-062",
    "eventId": "event-004",
    "priority": "Low"
  },
  {
    "employeeId": "emp-047",
    "companyId": "company-025",
    "eventId": "event-004",
    "priority": "Low"
  },
  {
    "employeeId": "emp-048",
    "companyId": "company-011",
    "eventId": "event-006",
    "priority": "High"
  },
  {
    "employeeId": "emp-048",
    "companyId": "company-096",
    "eventId": "event-006",
    "priority": "High"
  },
  {
    "employeeId": "emp-048",
    "companyId": "company-072",
    "eventId": "event-006",
    "priority": "High"
  },
  {
    "employeeId": "emp-049",
    "companyId": "company-002",
    "eventId": "event-024",
    "priority": "High"
  },
  {
    "employeeId": "emp-049",
    "companyId": "company-087",
    "eventId": "event-024",
    "priority": "Low"
  },
  {
    "employeeId": "emp-049",
    "companyId": "company-027",
    "eventId": "event-024",
    "priority": "High"
  },
  {
    "employeeId": "emp-050",
    "companyId": "company-029",
    "eventId": "event-026",
    "priority": "Low"
  },
  {
    "employeeId": "emp-050",
    "companyId": "company-024",
    "eventId": "event-026",
    "priority": "High"
  },
  {
    "employeeId": "emp-050",
    "companyId": "company-090",
    "eventId": "event-026",
    "priority": "High"
  },
  {
    "employeeId": "emp-051",
    "companyId": "company-048",
    "eventId": "event-018",
    "priority": "High"
  },
  {
    "employeeId": "emp-051",
    "companyId": "company-023",
    "eventId": "event-018",
    "priority": "Low"
  },
  {
    "employeeId": "emp-051",
    "companyId": "company-026",
    "eventId": "event-018",
    "priority": "High"
  },
  {
    "employeeId": "emp-052",
    "companyId": "company-066",
    "eventId": "event-008",
    "priority": "High"
  },
  {
    "employeeId": "emp-052",
    "companyId": "company-004",
    "eventId": "event-008",
    "priority": "Low"
  },
  {
    "employeeId": "emp-052",
    "companyId": "company-034",
    "eventId": "event-008",
    "priority": "High"
  },
  {
    "employeeId": "emp-053",
    "companyId": "company-080",
    "eventId": "event-008",
    "priority": "High"
  },
  {
    "employeeId": "emp-053",
    "companyId": "company-003",
    "eventId": "event-008",
    "priority": "High"
  },
  {
    "employeeId": "emp-053",
    "companyId": "company-020",
    "eventId": "event-008",
    "priority": "Low"
  }
] as BaseMeetingTargetSeedRow[];
