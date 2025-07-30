const Message = require('../models/Message'); 


const createMessage = async (req,res)=>{
    const {chatId, senderId, text} = req.body

    const message =  new Message({
        chatId, senderId, text
    })

    try {
        const response = await message.save()
        res.status(200).json(response)
    } catch (error) {
        res.status(500).json(error)
    }
}


const getMessages = async (req,res)=>{
    const {chatId} = req.params;

    try {
        const messages = await Message.find({chatId})
        res.status(200).json(messages)
    } catch (error) {
        res.status(500).json(error)
    }
}


module.exports = {
    createMessage,
    getMessages,

}