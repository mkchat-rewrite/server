package users

// store websocket connection data in here too
type User struct {
	Id        string `json:"id"`
	IpAddress string `json:"ipAddress"`
	Username  string `json:"username"`
	Room      string `json:"room"`
}

var users = make([]User, 0)

func Add(user User) {
	users = append(users, user)
}

func List() *[]User {
	return &users
}