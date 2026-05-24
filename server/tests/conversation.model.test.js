import Conversation from "../src/models/conversation.model.js";

describe("Conversation model", () => {
  it("defines only one unique sparse participantsKey index", () => {
    const participantKeyIndexes = Conversation.schema.indexes().filter(([fields]) => (
      Object.keys(fields).length === 1 && fields.participantsKey === 1
    ));

    expect(participantKeyIndexes).toHaveLength(1);
    expect(participantKeyIndexes[0][1]).toMatchObject({
      unique: true,
      sparse: true,
    });
  });
});
