
export const iso25010Categories = [
  {
    id: 'functional',
    name: 'Functional Suitability',
    description: 'Degree to which a product provides functions that meet stated and implied needs when used under specified conditions.',
    subCharacteristics: [
      { id: 'f1', name: 'Functional Completeness', desc: 'Degree to which the set of functions covers all the specified tasks and user objectives.' },
      { id: 'f2', name: 'Functional Correctness', desc: 'Degree to which a product or system provides the correct results with the needed degree of precision.' },
      { id: 'f3', name: 'Functional Appropriateness', desc: 'Degree to which the functions facilitate the accomplishment of specified tasks and objectives.' }
    ]
  },
  {
    id: 'performance',
    name: 'Performance Efficiency',
    description: 'Performance relative to the amount of resources used under stated conditions.',
    subCharacteristics: [
      { id: 'p1', name: 'Time Behavior', desc: 'Degree to which response and processing times and throughput rates meet requirements.' },
      { id: 'p2', name: 'Resource Utilization', desc: 'Degree to which the amounts and types of resources used meet requirements.' },
      { id: 'p3', name: 'Capacity', desc: 'Degree to which the maximum limits of a product parameter meet requirements.' }
    ]
  },
  {
    id: 'compatibility',
    name: 'Compatibility',
    description: 'Degree to which a product can exchange information with other products and perform its required functions while sharing the same hardware or software environment.',
    subCharacteristics: [
      { id: 'c1', name: 'Co-existence', desc: 'Degree to which a product can perform its functions efficiently while sharing a common environment.' },
      { id: 'c2', name: 'Interoperability', desc: 'Degree to which two or more systems can exchange information and use the information that has been exchanged.' }
    ]
  },
  {
    id: 'usability',
    name: 'Usability',
    description: 'Degree to which a product can be used by specified users to achieve specified goals with effectiveness, efficiency and satisfaction.',
    subCharacteristics: [
      { id: 'u1', name: 'Appropriateness Recognizability', desc: 'Degree to which users can recognize whether a product is appropriate for their needs.' },
      { id: 'u2', name: 'Learnability', desc: 'Degree to which a product can be used by specified users to achieve specified goals of learning.' },
      { id: 'u3', name: 'Operability', desc: 'Degree to which a product has attributes that make it easy to operate and control.' },
      { id: 'u4', name: 'User Error Protection', desc: 'Degree to which a system protects users against making errors.' },
      { id: 'u5', name: 'User Interface Aesthetics', desc: 'Degree to which a user interface enables pleasing and satisfying interaction.' },
      { id: 'u6', name: 'Accessibility', desc: 'Degree to which a product can be used by people with the widest range of characteristics.' }
    ]
  },
  {
    id: 'reliability',
    name: 'Reliability',
    description: 'Degree to which a system performs specified functions under specified conditions for a specified period of time.',
    subCharacteristics: [
      { id: 'r1', name: 'Maturity', desc: 'Degree to which a system meets needs for reliability under normal operation.' },
      { id: 'r2', name: 'Availability', desc: 'Degree to which a system is operational and accessible when required for use.' },
      { id: 'r3', name: 'Fault Tolerance', desc: 'Degree to which a system operates as intended despite the presence of hardware or software faults.' },
      { id: 'r4', name: 'Recoverability', desc: 'Degree to which, in the event of an interruption or a failure, a product can recover the data.' }
    ]
  },
  {
    id: 'security',
    name: 'Security',
    description: 'Degree to which a product protects information and data so that persons or other systems have the degree of data access appropriate to their types and levels of authorization.',
    subCharacteristics: [
      { id: 's1', name: 'Confidentiality', desc: 'Degree to which a product ensures that data are accessible only to those authorized to have access.' },
      { id: 's2', name: 'Integrity', desc: 'Degree to which a system prevents unauthorized access to, or modification of, computer programs or data.' },
      { id: 's3', name: 'Non-repudiation', desc: 'Degree to which actions or events can be proven to have taken place, so that the events cannot be repudiated later.' },
      { id: 's4', name: 'Accountability', desc: 'Degree to which the actions of an entity can be traced uniquely to the entity.' },
      { id: 's5', name: 'Authenticity', desc: 'Degree to which the identity of a subject or resource can be proved to be the one claimed.' }
    ]
  },
  {
    id: 'maintainability',
    name: 'Maintainability',
    description: 'Degree of effectiveness and efficiency with which a product can be modified by the intended maintainers.',
    subCharacteristics: [
      { id: 'm1', name: 'Modularity', desc: 'Degree to which a system is composed of discrete components such that a change to one has minimal impact.' },
      { id: 'm2', name: 'Reusability', desc: 'Degree to which an asset can be used in more than one system.' },
      { id: 'm3', name: 'Analyzability', desc: 'Degree of effectiveness and efficiency with which it is possible to assess the impact of a change.' },
      { id: 'm4', name: 'Modifiability', desc: 'Degree to which a product can be effectively and efficiently modified without introducing defects.' },
      { id: 'm5', name: 'Testability', desc: 'Degree of effectiveness and efficiency with which test criteria can be established for a system.' }
    ]
  },
  {
    id: 'portability',
    name: 'Portability',
    description: 'Degree of effectiveness and efficiency with which a system can be transferred from one hardware, software or other operational or usage environment to another.',
    subCharacteristics: [
      { id: 'pt1', name: 'Adaptability', desc: 'Degree to which a product can effectively and efficiently be adapted for different hardware or software.' },
      { id: 'pt2', name: 'Installability', desc: 'Degree of effectiveness and efficiency with which a product can be successfully installed and/or uninstalled.' },
      { id: 'pt3', name: 'Replaceability', desc: 'Degree to which a product can replace another specified software product for the same purpose.' }
    ]
  }
];
